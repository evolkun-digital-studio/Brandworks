#!/usr/bin/env node
/**
 * Smoke-test an unpacked release (or the repo's .next/standalone).
 *
 *   node scripts/smoke-release.mjs [releaseDir] [port]
 *
 * Inside a release folder (it ships as scripts/smoke-release.mjs) run it with
 * no arguments. Starts `node server.js` on 127.0.0.1:<port> (default 3999),
 * requests a few pages, a static asset, a public file, robots.txt and the
 * health check, then stops the server. Exit code 0 = all checks passed.
 *
 * Uses the environment it is started in. Without MONGODB_URI the health
 * check reports 503 ("mongodb": "disconnected"); that is accepted and noted,
 * because the check itself is what is being exercised.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.resolve(process.argv[2] ?? path.join(here, '..'))
const port = Number(process.argv[3] ?? 3999)
const base = `http://127.0.0.1:${port}`

if (!fs.existsSync(path.join(dir, 'server.js'))) {
  console.error(`[smoke] no server.js in ${dir}`)
  process.exit(1)
}

const env = { ...process.env, PORT: String(port), HOSTNAME: '127.0.0.1', NODE_ENV: 'production' }
env.PUBLIC_ORIGIN ||= base
const server = spawn(process.execPath, ['server.js'], { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] })
let output = ''
server.stdout.on('data', (d) => { output += d })
server.stderr.on('data', (d) => { output += d })

const stop = () => { if (server.exitCode === null) server.kill('SIGTERM') }
process.on('exit', stop)

async function waitForServer() {
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`server exited (${server.exitCode}):\n${output}`)
    try { await fetch(`${base}/robots.txt`); return } catch { await new Promise((r) => setTimeout(r, 500)) }
  }
  throw new Error(`server did not start within 30s:\n${output}`)
}

function firstStaticChunk() {
  const chunks = path.join(dir, '.next', 'static', 'chunks')
  const file = fs.readdirSync(chunks).find((f) => f.endsWith('.js'))
  return file ? `/_next/static/chunks/${file}` : null
}

const checks = [
  ['/', [200]],
  ['/services/performance-marketing', [200]],
  ['/blog', [200, 500, 503]],
  ['/robots.txt', [200]],
  ['/favicon.svg', [200]],
  ['/this-page-does-not-exist', [404]],
  ['/api/health', [200, 503]],
]

let failed = 0
try {
  await waitForServer()
  const chunk = firstStaticChunk()
  if (chunk) checks.push([chunk, [200]])
  for (const [route, ok] of checks) {
    const res = await fetch(`${base}${route}`, { redirect: 'manual' })
    const pass = ok.includes(res.status)
    let note = ''
    if (route === '/api/health') note = ` ${(await res.text()).slice(0, 160)}`
    if (route === '/blog' && res.status !== 200) note = ' (needs MONGODB_URI)'
    console.log(`[smoke] ${pass ? 'ok  ' : 'FAIL'} ${res.status} ${route}${note}`)
    if (!pass) failed++
  }
} catch (error) {
  console.error(`[smoke] ${error.message}`)
  failed++
} finally {
  stop()
}
console.log(failed ? `[smoke] ${failed} check(s) failed` : '[smoke] all checks passed')
process.exit(failed ? 1 : 0)
