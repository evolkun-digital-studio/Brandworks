#!/usr/bin/env node
/**
 * Build a self-contained, secret-free deployment artifact.
 *
 *   npm run build:release                 # build + package (on the target OS)
 *   npm run build:release -- --skip-build # package an existing .next build
 *   npm run build:release -- --allow-platform-mismatch   # local dry run only
 *
 * Output (git-ignored):
 *   dist/release/brandworks-next-<sha>/        unpacked release
 *   dist/brandworks-next-<sha>.tar.gz          archive to upload
 *   dist/brandworks-next-<sha>.tar.gz.sha256   checksum
 *
 * The release runs with `node server.js` from its own directory. It contains
 * the standalone server, the node_modules it traced, .next/static, public/,
 * scripts/smoke-test.mjs and release.json. It never contains .env files,
 * source maps, .git, or the build cache.
 *
 * Native modules (argon2, sharp) are compiled per OS/CPU, so the release must
 * be built on the same platform as the server (linux/x64 by default, override
 * with TARGET_PLATFORM / TARGET_ARCH). Build it in GitHub Actions on
 * ubuntu-latest, not on a developer Mac.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const args = new Set(process.argv.slice(2))
const TARGET_PLATFORM = process.env.TARGET_PLATFORM || 'linux'
const TARGET_ARCH = process.env.TARGET_ARCH || 'x64'
const TARGET_NODE_MAJOR = Number(process.env.TARGET_NODE_MAJOR || 22)

/** Server-only variable names that must never appear in browser JavaScript. */
const SERVER_ONLY_NAMES = [
  'MONGODB_URI', 'JWT_SECRET', 'R2_SECRET_ACCESS_KEY', 'R2_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY',
  'CLOUDINARY_API_SECRET', 'CF_IMAGES_API_TOKEN', 'OPENAI_API_KEY', 'ANTHROPIC_API_KEY',
  'DATAFORSEO_PASSWORD', 'MOZ_API_TOKEN', 'GA4_SERVICE_ACCOUNT_JSON', 'GSC_SERVICE_ACCOUNT_JSON',
]
/** Env names whose *values* are treated as secrets for the leak scan. */
const SECRET_NAME = /(SECRET|PASSWORD|TOKEN|_KEY|_URI|SERVICE_ACCOUNT)/
const FORBIDDEN = [/(^|\/)\.env(\..*)?$/, /(^|\/)\.git(\/|$)/, /\.map$/, /(^|\/)\.next\/cache(\/|$)/, /\.pem$/, /(^|\/)id_(rsa|ed25519)/]

const log = (msg) => console.log(`[release] ${msg}`)
const fail = (msg) => { console.error(`[release] ERROR: ${msg}`); process.exit(1) }
const rel = (p) => path.relative(ROOT, p)
const git = (...a) => { try { return execFileSync('git', a, { cwd: ROOT, encoding: 'utf8' }).trim() } catch { return '' } }

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isSymbolicLink()) out.push(full)
    else if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

// ----------------------------------------------------------------- preflight
const nodeMajor = Number(process.versions.node.split('.')[0])
if (nodeMajor !== TARGET_NODE_MAJOR) log(`warning: building on Node ${process.versions.node}; the server runs Node ${TARGET_NODE_MAJOR}.x. Use Node ${TARGET_NODE_MAJOR} in CI.`)
const platformMatches = process.platform === TARGET_PLATFORM && process.arch === TARGET_ARCH
if (!platformMatches) {
  const msg = `building on ${process.platform}/${process.arch} but the target is ${TARGET_PLATFORM}/${TARGET_ARCH}: argon2 and sharp binaries would not load on the server.`
  if (!args.has('--allow-platform-mismatch')) fail(`${msg} Build in CI on ${TARGET_PLATFORM}, or pass --allow-platform-mismatch for a local dry run (do NOT deploy that archive).`)
  log(`warning: ${msg} Dry run only: do NOT deploy this archive.`)
}

const commit = git('rev-parse', 'HEAD') || process.env.GITHUB_SHA || ''
if (!/^[0-9a-f]{40}$/.test(commit)) fail('could not determine the Git commit (run inside the repository).')
const short = commit.slice(0, 12)
const dirty = git('status', '--porcelain') !== ''
if (dirty) log('warning: the working tree has uncommitted changes; release.json records dirty=true.')

// --------------------------------------------------------------------- build
// Clear earlier output first so the build's file tracer cannot pick it up.
const DIST = path.join(ROOT, 'dist')
fs.rmSync(path.join(DIST, 'release'), { recursive: true, force: true })
if (!args.has('--skip-build')) {
  log('running next build…')
  const result = spawnSync('npx', ['next', 'build'], { cwd: ROOT, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' } })
  if (result.status !== 0) fail('next build failed.')
}

const NEXT = path.join(ROOT, '.next')
const STANDALONE = path.join(NEXT, 'standalone')
for (const [p, what] of [[path.join(STANDALONE, 'server.js'), 'standalone server.js (is output: "standalone" set?)'], [path.join(NEXT, 'static'), '.next/static'], [path.join(NEXT, 'BUILD_ID'), '.next/BUILD_ID'], [path.join(ROOT, 'public'), 'public/']]) {
  if (!fs.existsSync(p)) fail(`missing ${what}`)
}
const buildId = fs.readFileSync(path.join(NEXT, 'BUILD_ID'), 'utf8').trim()

// ------------------------------------------------------------------ assemble
const NAME = `brandworks-next-${short}`
const OUT = path.join(DIST, 'release', NAME)
fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
log(`assembling ${rel(OUT)}`)
fs.cpSync(STANDALONE, OUT, { recursive: true, verbatimSymlinks: true })
fs.cpSync(path.join(NEXT, 'static'), path.join(OUT, '.next', 'static'), { recursive: true })
fs.cpSync(path.join(ROOT, 'public'), path.join(OUT, 'public'), { recursive: true })
fs.mkdirSync(path.join(OUT, 'scripts'), { recursive: true })
fs.copyFileSync(path.join(ROOT, 'scripts', 'smoke-test.mjs'), path.join(OUT, 'scripts', 'smoke-test.mjs'))

// Strip anything that must never ship (standalone may copy .env files in).
let stripped = 0
for (const file of walk(OUT)) {
  const r = path.relative(OUT, file).split(path.sep).join('/')
  if (FORBIDDEN.some((re) => re.test(r))) { fs.rmSync(file, { recursive: true, force: true }); stripped++ }
}
fs.rmSync(path.join(OUT, '.next', 'cache'), { recursive: true, force: true })
log(`stripped ${stripped} forbidden file(s) (.env*, source maps, caches, keys)`)

// ------------------------------------------------------------------ validate
const files = walk(OUT)
const relFiles = files.map((f) => path.relative(OUT, f).split(path.sep).join('/'))
const problems = []

for (const required of ['server.js', 'package.json', '.next/BUILD_ID', '.next/server', '.next/static', 'public', 'node_modules/next']) {
  if (!fs.existsSync(path.join(OUT, required))) problems.push(`missing ${required}`)
}
if (!relFiles.some((f) => f.startsWith('.next/static/chunks/'))) problems.push('.next/static/chunks is empty')
const leftovers = relFiles.filter((f) => FORBIDDEN.some((re) => re.test(f)))
if (leftovers.length) problems.push(`forbidden files remain: ${leftovers.slice(0, 5).join(', ')}`)

// Native modules must be present for the target platform. argon2 bundles
// prebuilt binaries for every platform, so its target binary can be checked
// even on a dry run; sharp installs only the host's binary.
if (!relFiles.some((f) => f.startsWith(`node_modules/argon2/prebuilds/${TARGET_PLATFORM}-${TARGET_ARCH}/`) && f.endsWith('.node'))) {
  problems.push(`argon2 native binary for ${TARGET_PLATFORM}-${TARGET_ARCH} not in the release (admin login would fail)`)
}
if (relFiles.some((f) => /^src\/.*\.tsx?$/.test(f))) problems.push('TypeScript sources were traced into the release')
for (const stray of ['dist/', 'scratch/', '.media-storage/', 'tests/', 'docs/']) {
  if (relFiles.some((f) => f.startsWith(stray))) problems.push(`${stray} was traced into the release`)
}
if (platformMatches) {
  const sharpTraced = relFiles.some((f) => f.startsWith('node_modules/sharp/'))
  if (sharpTraced && !relFiles.some((f) => f.startsWith(`node_modules/@img/sharp-${TARGET_PLATFORM}-${TARGET_ARCH}`))) problems.push(`sharp binary for ${TARGET_PLATFORM}-${TARGET_ARCH} missing (image optimisation would fail)`)
}

// Load the server's external dependencies from inside the release, the way
// server.js will. The file tracer can miss files (it once shipped
// @mongodb-js/saslprep without its dist/), and a miss only shows up as a 500
// at runtime, so prove they resolve here instead.
{
  const probes = ['mongodb', '@aws-sdk/client-s3', 'next/dist/server/next-server.js']
  if (platformMatches) probes.push('argon2', 'sharp')
  const script = `const r=require('node:module').createRequire(process.cwd()+'/server.js');const bad=[];for(const m of ${JSON.stringify(probes)}){try{r(m)}catch(e){bad.push(m+': '+String(e&&e.message).split('\\n')[0])}}if(bad.length){console.error(bad.join('\\n'));process.exit(1)}`
  const probe = spawnSync(process.execPath, ['-e', script], { cwd: OUT, encoding: 'utf8', env: { PATH: process.env.PATH, NODE_ENV: 'production' } })
  if (probe.status !== 0) problems.push(`runtime dependencies fail to load from the release:\n      ${(probe.stderr || '').trim().split('\n').join('\n      ')}`)
}

// 1) Server-only variable names must not appear in browser JavaScript.
for (const file of files.filter((f) => /\.next\/static\/.*\.js$/.test(f.split(path.sep).join('/')))) {
  const text = fs.readFileSync(file, 'utf8')
  const hit = SERVER_ONLY_NAMES.find((name) => text.includes(name))
  if (hit) problems.push(`server-only name ${hit} found in browser bundle ${path.relative(OUT, file)}`)
}
// 2) No secret *value* from the build environment may appear anywhere.
const secretValues = Object.entries(process.env)
  .filter(([name, value]) => SECRET_NAME.test(name) && !name.startsWith('NEXT_PUBLIC_') && typeof value === 'string' && value.length >= 12)
  .map(([name, value]) => [name, value])
if (secretValues.length) {
  for (const file of files) {
    let stat
    try { stat = fs.statSync(file) } catch { continue }
    if (!stat.isFile() || stat.size > 20 * 1024 * 1024) continue
    const text = fs.readFileSync(file, 'latin1')
    for (const [name, value] of secretValues) {
      if (text.includes(value)) problems.push(`value of ${name} found in ${path.relative(OUT, file)}`)
    }
  }
}

if (problems.length) {
  for (const p of problems) console.error(`[release]   - ${p}`)
  fail(`release validation failed (${problems.length} problem(s)); nothing was packaged.`)
}

// ------------------------------------------------------------------ manifest
const nextVersion = JSON.parse(fs.readFileSync(path.join(ROOT, 'node_modules', 'next', 'package.json'), 'utf8')).version
const manifest = {
  name: NAME,
  commit,
  shortCommit: short,
  branch: git('rev-parse', '--abbrev-ref', 'HEAD') || process.env.GITHUB_REF_NAME || '',
  dirty,
  buildId,
  builtAt: new Date().toISOString(),
  builtWith: { node: process.versions.node, platform: process.platform, arch: process.arch },
  target: { node: `${TARGET_NODE_MAJOR}.x`, platform: TARGET_PLATFORM, arch: TARGET_ARCH },
  deployable: platformMatches,
  nextVersion,
  start: 'NODE_ENV=production PORT=3010 HOSTNAME=127.0.0.1 node server.js',
  fileCount: relFiles.length,
}
fs.writeFileSync(path.join(OUT, 'release.json'), `${JSON.stringify(manifest, null, 2)}\n`)

// ------------------------------------------------------------------- archive
const archive = path.join(DIST, `${NAME}.tar.gz`)
fs.rmSync(archive, { force: true })
const tar = spawnSync('tar', ['-czf', archive, '-C', path.join(DIST, 'release'), NAME], { stdio: 'inherit' })
if (tar.status !== 0) fail('tar failed.')
const sha256 = createHash('sha256').update(fs.readFileSync(archive)).digest('hex')
fs.writeFileSync(`${archive}.sha256`, `${sha256}  ${path.basename(archive)}\n`)

const mb = (fs.statSync(archive).size / 1024 / 1024).toFixed(1)
log(`OK ${rel(archive)} (${mb} MB, ${relFiles.length} files, commit ${short}${dirty ? ', DIRTY' : ''})`)
log(`sha256 ${sha256}`)
if (!platformMatches) log('reminder: this archive was built for the wrong platform and is NOT deployable.')
