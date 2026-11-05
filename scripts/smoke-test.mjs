#!/usr/bin/env node
/**
 * Production smoke test. Read-only, needs no credentials, prints no secrets.
 *
 *   node scripts/smoke-test.mjs https://brandworks.me
 *   node scripts/smoke-test.mjs http://127.0.0.1:3010 --expect-origin https://brandworks.me
 *
 * --expect-origin is the PUBLIC_ORIGIN the server should advertise in
 * robots.txt / sitemap.xml (defaults to the base URL's origin). Use it when
 * testing the Node port directly, before Apache is in front.
 *
 * Exits 1 if any check fails, so it can gate a deploy and trigger a rollback.
 */
const argv = process.argv.slice(2)
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined }
const BASE = (argv.find((a) => /^https?:\/\//.test(a) && a !== flag('--expect-origin')) || process.env.SMOKE_BASE_URL || 'http://127.0.0.1:3010').replace(/\/+$/, '')
const EXPECT_ORIGIN = new URL(flag('--expect-origin') || process.env.SMOKE_EXPECT_ORIGIN || BASE).origin
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS || 15000)

let failures = 0
const pass = (name, detail = '') => console.log(`  ok    ${name}${detail ? ` (${detail})` : ''}`)
const bad = (name, detail) => { failures++; console.log(`  FAIL  ${name}: ${detail}`) }

async function get(path, init = {}) {
  const res = await fetch(`${BASE}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(TIMEOUT_MS), ...init })
  const body = init.method === 'HEAD' ? '' : await res.text()
  return { res, body }
}

async function check(name, fn) {
  try { await fn() } catch (error) { bad(name, error instanceof Error ? error.message : String(error)) }
}

console.log(`Smoke test: ${BASE} (expecting public origin ${EXPECT_ORIGIN})`)

await check('GET / renders', async () => {
  const { res, body } = await get('/')
  if (res.status !== 200) return bad('GET /', `status ${res.status}`)
  if (!/<html/i.test(body)) return bad('GET /', 'response is not HTML')
  const missing = ['x-content-type-options', 'referrer-policy', 'x-frame-options'].filter((h) => !res.headers.get(h))
  if (missing.length) return bad('GET / security headers', `missing ${missing.join(', ')}`)
  if (res.headers.get('x-powered-by')) return bad('GET /', 'X-Powered-By header is exposed')
  pass('GET /', 'HTML + security headers')
})

await check('GET /api/health', async () => {
  const { res, body } = await get('/api/health')
  let json
  try { json = JSON.parse(body) } catch { return bad('GET /api/health', `status ${res.status}, body is not JSON`) }
  if (res.status !== 200 || json.status !== 'ok') {
    const parts = ['mongodb', 'publicOrigin', 'adminAuth'].map((k) => `${k}=${json[k]}`).join(' ')
    return bad('GET /api/health', `status ${res.status} ${json.status} (${parts})`)
  }
  if ((res.headers.get('cache-control') || '').includes('no-store') === false) return bad('GET /api/health', 'missing Cache-Control: no-store')
  pass('GET /api/health', `ok, commit ${String(json.commit).slice(0, 12)}`)
})

await check('HEAD /api/health', async () => {
  const { res } = await get('/api/health', { method: 'HEAD' })
  if (res.status !== 200) return bad('HEAD /api/health', `status ${res.status}`)
  pass('HEAD /api/health')
})

await check('GET /robots.txt', async () => {
  const { res, body } = await get('/robots.txt')
  if (res.status !== 200) return bad('GET /robots.txt', `status ${res.status}`)
  if (!body.includes(`Sitemap: ${EXPECT_ORIGIN}/sitemap.xml`)) return bad('GET /robots.txt', `Sitemap line does not point at ${EXPECT_ORIGIN}`)
  if (!/Disallow: \/admin\b/.test(body)) return bad('GET /robots.txt', 'does not disallow /admin')
  if (/localhost|127\.0\.0\.1/.test(body)) return bad('GET /robots.txt', 'contains a localhost URL')
  pass('GET /robots.txt')
})

let firstPostPath = null
await check('GET /sitemap.xml', async () => {
  const { res, body } = await get('/sitemap.xml')
  if (res.status !== 200) return bad('GET /sitemap.xml', `status ${res.status}`)
  if (!(res.headers.get('content-type') || '').includes('xml')) return bad('GET /sitemap.xml', 'content-type is not XML')
  const locs = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
  if (locs.length < 10) return bad('GET /sitemap.xml', `only ${locs.length} URLs`)
  const foreign = locs.filter((loc) => !loc.startsWith(`${EXPECT_ORIGIN}/`) && loc !== EXPECT_ORIGIN)
  if (foreign.length) return bad('GET /sitemap.xml', `URLs outside ${EXPECT_ORIGIN}, e.g. ${foreign[0]}`)
  if (locs.some((loc) => /\/admin|\/api\//.test(loc))) return bad('GET /sitemap.xml', 'lists an admin or API URL')
  const post = locs.find((loc) => /\/(blog|news)\/[^/]+$/.test(loc))
  if (post) firstPostPath = new URL(post).pathname
  pass('GET /sitemap.xml', `${locs.length} URLs`)
})

for (const path of ['/about', '/services', '/blog', '/news']) {
  await check(`GET ${path}`, async () => {
    const { res } = await get(path)
    if (res.status !== 200) return bad(`GET ${path}`, `status ${res.status}`)
    pass(`GET ${path}`)
  })
}

await check('blog/news article', async () => {
  if (!firstPostPath) return pass('blog/news article', 'skipped: no published posts in sitemap')
  const { res } = await get(firstPostPath)
  if (res.status !== 200) return bad(`GET ${firstPostPath}`, `status ${res.status}`)
  pass(`GET ${firstPostPath}`)
})

await check('public blog API', async () => {
  const { res, body } = await get('/api/blogs?page=1&limit=1')
  if (res.status !== 200) return bad('GET /api/blogs', `status ${res.status}`)
  JSON.parse(body)
  pass('GET /api/blogs')
})

await check('admin login page', async () => {
  const { res, body } = await get('/admin/login')
  if (res.status !== 200) return bad('GET /admin/login', `status ${res.status}`)
  if (!/noindex/i.test(res.headers.get('x-robots-tag') || '')) return bad('GET /admin/login', 'missing X-Robots-Tag: noindex')
  if (!/<meta name="robots" content="[^"]*noindex/i.test(body)) return bad('GET /admin/login', 'missing robots noindex meta tag')
  pass('GET /admin/login', 'reachable, noindex')
})

await check('admin API is private', async () => {
  const { res } = await get('/api/admin/auth/me')
  if (res.status !== 401) return bad('GET /api/admin/auth/me (no session)', `expected 401, got ${res.status}`)
  const blogs = await get('/api/admin/blogs')
  if (blogs.res.status !== 401) return bad('GET /api/admin/blogs (no session)', `expected 401, got ${blogs.res.status}`)
  pass('admin API without a session', '401')
})

await check('unknown route', async () => {
  const { res } = await get('/this-route-should-not-exist-smoke')
  if (res.status !== 404) return bad('unknown route', `expected 404, got ${res.status}`)
  pass('unknown route', '404')
})

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed')
process.exit(failures ? 1 : 0)
