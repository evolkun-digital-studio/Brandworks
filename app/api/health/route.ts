import { pingDatabase } from '../../../src/server/db/client'
import { resolvePublicOrigin } from '../../../src/server/config/env'

export const runtime = 'nodejs'
// Always run at request time: a cached health answer is a wrong one.
export const dynamic = 'force-dynamic'

/** A hung database must fail the check quickly, not hang the prober. */
const DB_TIMEOUT_MS = 3000

const NO_STORE = { 'Cache-Control': 'no-store, max-age=0' }

async function checkDatabase(): Promise<boolean> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<boolean>((resolve) => {
    timer = setTimeout(() => resolve(false), DB_TIMEOUT_MS)
  })
  try {
    return await Promise.race([pingDatabase(), timeout])
  } finally {
    clearTimeout(timer)
  }
}

/** sitemap.xml and robots.txt need PUBLIC_ORIGIN in production; surface a bad value here. */
function checkPublicOrigin(): boolean {
  try {
    resolvePublicOrigin()
    return true
  } catch {
    return false
  }
}

async function runChecks() {
  const [database, publicOrigin] = [await checkDatabase(), checkPublicOrigin()]
  return { database, publicOrigin, healthy: database && publicOrigin }
}

export async function GET(): Promise<Response> {
  const { database, publicOrigin, healthy } = await runChecks()
  const body = {
    status: healthy ? 'ok' : 'degraded',
    server: 'running',
    mongodb: database ? 'connected' : 'disconnected',
    publicOrigin: publicOrigin ? 'configured' : 'missing-or-invalid',
    environment: process.env.NODE_ENV ?? 'development',
    commit: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }

  return Response.json(body, { status: healthy ? 200 : 503, headers: NO_STORE })
}

/** Load balancers and uptime monitors often probe with HEAD: same status, no body. */
export async function HEAD(): Promise<Response> {
  const { healthy } = await runChecks()
  return new Response(null, { status: healthy ? 200 : 503, headers: NO_STORE })
}
