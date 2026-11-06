#!/usr/bin/env node
/**
 * Build a self-contained, secret-free release of the standalone Next.js
 * server for the production target: Linux x64 (glibc), Node.js 24.
 *
 *   npm run build:release                  # next build + package
 *   npm run build:release -- --skip-build  # package the existing .next build
 *   npm run build:release -- --no-smoke    # skip the boot/HTTP smoke test
 *
 * Output (all git-ignored, under dist/):
 *   dist/release/brandworks-next-<sha>/          unpacked release
 *   dist/brandworks-next-<sha>.tar.gz            archive to upload
 *   dist/brandworks-next-<sha>.tar.gz.sha256     checksum
 *
 * Staging happens in a temp folder outside the repository (so module
 * resolution cannot fall back to the repo's node_modules), where the release
 * is checked: dependencies load, native binaries match the target, no
 * secrets or forbidden files, and it boots and serves (scripts/smoke-release.mjs).
 *
 * The release contains server.js, the node_modules the build traced,
 * .next/ (server output + static assets), public/ and release.json. Start it
 * from its own directory with `node server.js`. It never contains .env files,
 * .git, keys, source maps or the build cache.
 *
 * NEXT_PUBLIC_* values (and R2_PUBLIC_URL) are inlined during `next build`,
 * so export them before running this. See .env.production.example.
 *
 * Native modules. JavaScript output is platform-independent; native binaries
 * are not. For the target this script:
 *   - argon2: keeps only prebuilds/linux-x64 and removes any build/ folder
 *     (node-gyp-build would load a build/ binary first, and on a Mac that is a
 *     macOS binary).
 *   - sharp: when the build host is not linux-x64, replaces the host's @img
 *     binaries with @img/sharp-linux-x64 + @img/sharp-libvips-linux-x64 at the
 *     exact versions sharp requires, verifying each tarball against the
 *     package-lock.json integrity hash.
 *   - then fails unless every native file in the release is an x86-64 ELF.
 * Building on a Linux x64 machine (e.g. CI) needs no swapping at all.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))
const TARGET = { platform: 'linux', arch: 'x64', node: '24.22.2' }
const HOST_IS_TARGET = process.platform === TARGET.platform && process.arch === TARGET.arch

/** Server-only variables whose values must never be baked into a release. */
const SERVER_SECRETS = [
  'MONGODB_URI', 'JWT_SECRET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'S3_ACCESS_KEY_ID',
  'S3_SECRET_ACCESS_KEY', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'CF_IMAGES_API_TOKEN',
  'OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'GOOGLE_PSI_API_KEY', 'MOZ_API_TOKEN', 'DATAFORSEO_LOGIN',
  'DATAFORSEO_PASSWORD', 'GA4_SERVICE_ACCOUNT_JSON', 'GSC_SERVICE_ACCOUNT_JSON',
]
/** Never allowed in a release. */
const FORBIDDEN = [/(^|\/)\.env(\.|$)/, /(^|\/)\.git(\/|$)/, /\.pem$/, /\.key$/, /(^|\/)id_(rsa|ed25519|ecdsa)/, /(^|\/)\.next\/cache(\/|$)/, /(^|\/)\.media-storage(\/|$)/]
/** Removed from a release: no runtime use, and source maps would expose source. */
const STRIP = [/\.map$/, /(^|\/)\.DS_Store$/, /(^|\/)\._[^/]*$/]

const log = (msg) => console.log(`[release] ${msg}`)
const warn = (msg) => console.warn(`[release] WARNING: ${msg}`)
const fail = (msg) => { console.error(`[release] ERROR: ${msg}`); process.exit(1) }
const relTo = (base, p) => path.relative(base, p).split(path.sep).join('/')
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim() } catch { return '' } }
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'))

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory() && !entry.isSymbolicLink()) walk(full, out)
    else out.push(full)
  }
  return out
}

function run(cmd, cmdArgs, opts = {}) {
  const result = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', ...opts })
  if (result.status !== 0) fail(`${cmd} ${cmdArgs.join(' ')} exited with ${result.status}`)
}

// ---------------------------------------------------------------- preflight
if (process.versions.node !== TARGET.node) {
  warn(`building with Node ${process.versions.node}; production runs Node ${TARGET.node}. Use \`nvm use\` (.nvmrc) for a matching build.`)
}
const sha = git('rev-parse', '--short=12', 'HEAD') || 'nogit'
const dirty = git('status', '--porcelain') !== ''
if (dirty) warn('working tree has uncommitted changes; the release will not match any commit exactly.')
const publicNames = Object.keys(process.env).filter((k) => k.startsWith('NEXT_PUBLIC_') && process.env[k]?.trim()).sort()
log(`target ${TARGET.platform}-${TARGET.arch}, Node ${TARGET.node}; host ${process.platform}-${process.arch}, Node ${process.versions.node}`)
log(`NEXT_PUBLIC_* set for this build: ${publicNames.length ? publicNames.join(', ') : '(none — analytics/public config will be disabled)'}`)
if (!process.env.R2_PUBLIC_URL?.trim()) warn('R2_PUBLIC_URL is not set: Media Manager images will not be allowed by next/image in this build.')

// -------------------------------------------------------------------- build
if (!args.has('--skip-build')) {
  log('running next build…')
  run('npm', ['run', 'build'])
}
const standalone = path.join(ROOT, '.next', 'standalone')
if (!fs.existsSync(path.join(standalone, 'server.js'))) {
  fail('.next/standalone/server.js not found. Is output: "standalone" set in next.config.ts?')
}

// -------------------------------------------------------------------- stage
const name = `brandworks-next-${sha}${dirty ? '-dirty' : ''}`
// Stage OUTSIDE the repository. Node resolves modules by walking up parent
// folders, so a release checked inside the repo silently borrows the repo's
// own node_modules and hides anything the tracer missed.
const stagingRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'brandworks-stage-'))
for (let dir = stagingRoot; dir !== path.dirname(dir); dir = path.dirname(dir)) {
  if (fs.existsSync(path.join(dir, 'node_modules'))) fail(`staging folder ${stagingRoot} has a node_modules above it (${dir}); set TMPDIR elsewhere.`)
}
process.on('exit', () => fs.rmSync(stagingRoot, { recursive: true, force: true }))
const releaseDir = path.join(stagingRoot, name)
fs.mkdirSync(releaseDir, { recursive: true })
log(`staging in ${releaseDir} (isolated from the repo's node_modules)`)
fs.cpSync(standalone, releaseDir, { recursive: true, verbatimSymlinks: true })
// The tracer copies only the public files server code touched; ship all of them.
fs.rmSync(path.join(releaseDir, 'public'), { recursive: true, force: true })
fs.cpSync(path.join(ROOT, 'public'), path.join(releaseDir, 'public'), { recursive: true })
fs.cpSync(path.join(ROOT, '.next', 'static'), path.join(releaseDir, '.next', 'static'), { recursive: true })
fs.mkdirSync(path.join(releaseDir, 'scripts'), { recursive: true })
fs.copyFileSync(path.join(ROOT, 'scripts', 'smoke-release.mjs'), path.join(releaseDir, 'scripts', 'smoke-release.mjs'))

const modules = path.join(releaseDir, 'node_modules')

// ----------------------------------------------------------------- argon2
const argon2 = path.join(modules, 'argon2')
if (!fs.existsSync(argon2)) fail('argon2 is not in the traced node_modules (admin login needs it).')
fs.rmSync(path.join(argon2, 'build'), { recursive: true, force: true })
const prebuilds = path.join(argon2, 'prebuilds')
const targetPrebuild = `${TARGET.platform}-${TARGET.arch}`
if (!fs.existsSync(path.join(prebuilds, targetPrebuild, 'argon2.glibc.node'))) {
  fail(`argon2 prebuild ${targetPrebuild}/argon2.glibc.node missing — check outputFileTracingIncludes in next.config.ts.`)
}
for (const entry of fs.readdirSync(prebuilds)) {
  if (entry !== targetPrebuild) fs.rmSync(path.join(prebuilds, entry), { recursive: true, force: true })
}
log(`argon2: kept prebuilds/${targetPrebuild} only`)

// ------------------------------------------------------------------ sharp
const sharpPkg = readJson(path.join(ROOT, 'node_modules', 'sharp', 'package.json'))
const lock = readJson(path.join(ROOT, 'package-lock.json')).packages
const sharpTargets = [`@img/sharp-${targetPrebuild}`, `@img/sharp-libvips-${targetPrebuild}`]
const imgDir = path.join(modules, '@img')
if (!fs.existsSync(path.join(modules, 'sharp'))) fail('sharp is not in the traced node_modules (next/image needs it).')
fs.mkdirSync(imgDir, { recursive: true })
for (const entry of fs.readdirSync(imgDir)) {
  // Drop every platform-specific @img package that is not the target's.
  if (/^sharp-(libvips-)?/.test(entry) && !sharpTargets.includes(`@img/${entry}`)) {
    fs.rmSync(path.join(imgDir, entry), { recursive: true, force: true })
    log(`sharp: removed host binary package @img/${entry}`)
  }
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brandworks-release-'))
try {
  for (const pkg of sharpTargets) {
    const dest = path.join(modules, pkg)
    if (fs.existsSync(dest)) continue
    const version = sharpPkg.optionalDependencies?.[pkg]
    const locked = lock[`node_modules/${pkg}`]
    if (!version || !locked?.integrity) fail(`${pkg} is not pinned in sharp's optionalDependencies / package-lock.json.`)
    if (locked.version !== version) fail(`${pkg}: package-lock has ${locked.version}, sharp ${sharpPkg.version} needs ${version}.`)
    log(`sharp: fetching ${pkg}@${version} for ${targetPrebuild}`)
    const out = execFileSync('npm', ['pack', `${pkg}@${version}`, '--pack-destination', tmp, '--json', '--silent'], { cwd: tmp, encoding: 'utf8' })
    const tarball = path.join(tmp, JSON.parse(out)[0].filename)
    const [algo, expected] = locked.integrity.split('-')
    const actual = createHash(algo).update(fs.readFileSync(tarball)).digest('base64')
    if (actual !== expected) fail(`${pkg}@${version}: tarball integrity does not match package-lock.json.`)
    const unpack = path.join(tmp, pkg.replace('/', '__'))
    fs.mkdirSync(unpack)
    execFileSync('tar', ['-xzf', tarball, '-C', unpack])
    fs.cpSync(path.join(unpack, 'package'), dest, { recursive: true })
    log(`sharp: installed ${pkg}@${version} (integrity verified)`)
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true })
}

// ------------------------------------------------------- strip & forbidden
let stripped = 0
for (const file of walk(releaseDir)) {
  const rel = relTo(releaseDir, file)
  if (STRIP.some((re) => re.test(rel))) { fs.rmSync(file, { force: true }); stripped++ }
}
const files = walk(releaseDir)
const forbidden = files.map((f) => relTo(releaseDir, f)).filter((rel) => FORBIDDEN.some((re) => re.test(rel)))
if (forbidden.length) fail(`forbidden files in release:\n  ${forbidden.join('\n  ')}`)
log(`removed ${stripped} source map / OS metadata files; no forbidden files`)

// ---------------------------------------------------------- module loading
// The tracer can copy a package's package.json without the files it loads
// (seen with @mongodb-js/saslprep, which broke every database call). Load
// each production dependency that ships in the release, from inside the
// release, exactly as server.js would. Native modules can only load on the
// target platform, so they are checked here only when building on it.
const NATIVE = new Set(['argon2', 'sharp'])
const deps = Object.keys(readJson(path.join(ROOT, 'package.json')).dependencies ?? {})
  .filter((dep) => fs.existsSync(path.join(modules, dep, 'package.json')))
  .filter((dep) => HOST_IS_TARGET || !NATIVE.has(dep))
const loader = `
const { createRequire } = require('node:module')
const req = createRequire(${JSON.stringify(path.join(releaseDir, 'server.js'))})
const failures = []
;(async () => {
  for (const dep of ${JSON.stringify(deps)}) {
    try { req(dep) } catch (error) {
      if (error.code === 'ERR_REQUIRE_ESM' || error.code === 'ERR_PACKAGE_PATH_NOT_EXPORTED') {
        try { await import(req.resolve(dep)) } catch (inner) { failures.push(dep + ': ' + inner.message.split('\\n')[0]) }
      } else failures.push(dep + ': ' + error.message.split('\\n')[0])
    }
  }
  if (failures.length) { console.error(failures.join('\\n')); process.exit(1) }
})()
`
const loaded = spawnSync(process.execPath, ['-e', loader], { cwd: releaseDir, encoding: 'utf8', env: { NODE_ENV: 'production', PATH: process.env.PATH } })
if (loaded.status !== 0) fail(`production dependencies that fail to load from the release:\n  ${(loaded.stderr || loaded.stdout).trim().split('\n').join('\n  ')}`)
log(`module loading: ${deps.length} production dependencies load from the release${HOST_IS_TARGET ? '' : ' (native argon2/sharp skipped: not on linux-x64)'}`)

// --------------------------------------------------------- native binaries
/** ELF, 64-bit, little-endian, x86-64 — what Linux x64 can load. */
function nativeKind(file) {
  const fd = fs.openSync(file, 'r')
  const head = Buffer.alloc(20)
  fs.readSync(fd, head, 0, 20, 0)
  fs.closeSync(fd)
  if (head.readUInt32BE(0) === 0x7f454c46) {
    return head[4] === 2 && head[5] === 1 && head.readUInt16LE(18) === 0x3e ? 'elf-x64' : 'elf-other'
  }
  if ([0xfeedface, 0xfeedfacf, 0xcefaedfe, 0xcffaedfe, 0xcafebabe].includes(head.readUInt32BE(0))) return 'mach-o'
  if (head.readUInt16BE(0) === 0x4d5a) return 'pe'
  return 'unknown'
}
const natives = files.filter((f) => /\.(node|so(\.\d+)*|dylib|dll)$/.test(f))
const wrong = natives.filter((f) => nativeKind(f) !== 'elf-x64')
if (wrong.length) fail(`native files not built for linux-x64:\n  ${wrong.map((f) => `${relTo(releaseDir, f)} (${nativeKind(f)})`).join('\n  ')}`)
if (!natives.length) fail('no native binaries found — argon2/sharp missing?')
log(`native binaries (all linux x86-64 ELF):\n  ${natives.map((f) => relTo(releaseDir, f)).join('\n  ')}`)

// --------------------------------------------------------------- leak scan
const secrets = SERVER_SECRETS.map((k) => [k, process.env[k]?.trim()]).filter(([, v]) => v && v.length >= 8)
if (secrets.length) {
  const scanned = files.filter((f) => {
    if (relTo(releaseDir, f).startsWith('node_modules/')) return false
    const stat = fs.lstatSync(f)
    return stat.isFile() && stat.size < 20 * 1024 * 1024
  })
  for (const file of scanned) {
    const text = fs.readFileSync(file, 'latin1')
    for (const [key, value] of secrets) {
      if (text.includes(value)) fail(`the value of ${key} appears in ${relTo(releaseDir, file)}`)
    }
  }
  log(`leak scan: ${secrets.length} secret value(s) from this environment found in none of ${scanned.length} files`)
} else {
  log('leak scan: no server secrets set in this environment (nothing to compare against)')
}

// ---------------------------------------------------------------- manifest
const nextVersion = readJson(path.join(ROOT, 'node_modules', 'next', 'package.json')).version
const manifest = {
  name,
  commit: git('rev-parse', 'HEAD') || null,
  branch: git('rev-parse', '--abbrev-ref', 'HEAD') || null,
  dirty,
  builtAt: new Date().toISOString(),
  next: nextVersion,
  target: { ...TARGET, libc: 'glibc' },
  buildHost: { platform: process.platform, arch: process.arch, node: process.versions.node, nativeSwap: !HOST_IS_TARGET },
  publicEnv: publicNames,
  start: 'node server.js',
}
fs.writeFileSync(path.join(releaseDir, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`)

// ------------------------------------------------------------------- smoke
// Boots the isolated release and requests pages, assets and the health
// check. Runs with a scrubbed environment: no database or secrets, so a
// build machine holding production credentials never connects anywhere.
if (!args.has('--no-smoke')) {
  log('smoke test (isolated release, no database configured)…')
  const smokeEnv = { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: os.tmpdir() }
  run(process.execPath, [path.join(releaseDir, 'scripts', 'smoke-release.mjs'), releaseDir], { cwd: releaseDir, env: smokeEnv })
}

// ----------------------------------------------------------------- archive
fs.mkdirSync(path.join(ROOT, 'dist', 'release'), { recursive: true })
const archive = path.join(ROOT, 'dist', `${name}.tar.gz`)
fs.rmSync(archive, { force: true })
const tarArgs = ['-czf', archive, '-C', stagingRoot, name]
if (process.platform === 'darwin') tarArgs.unshift('--no-mac-metadata')
run('tar', tarArgs, { env: { ...process.env, COPYFILE_DISABLE: '1' } })
const digest = createHash('sha256').update(fs.readFileSync(archive)).digest('hex')
fs.writeFileSync(`${archive}.sha256`, `${digest}  ${path.basename(archive)}\n`)
// Unpacked copy for inspection only; deploy the archive.
const unpacked = path.join(ROOT, 'dist', 'release', name)
fs.rmSync(unpacked, { recursive: true, force: true })
fs.cpSync(releaseDir, unpacked, { recursive: true, verbatimSymlinks: true })
const mb = (fs.statSync(archive).size / 1024 / 1024).toFixed(1)
log(`archive ${relTo(ROOT, archive)} (${mb} MB)`)
log(`sha256  ${digest}`)
log(`unpacked copy (inspection only) ${relTo(ROOT, unpacked)}`)
if (!HOST_IS_TARGET) {
  warn(`built on ${process.platform}-${process.arch}: binaries were swapped for ${targetPrebuild}. Smoke-test on a Linux x64 host before switching traffic.`)
}
