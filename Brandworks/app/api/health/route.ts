import { pingDatabase } from '../../../src/server/db/client'

export const runtime = 'nodejs'

export async function GET(): Promise<Response> {
  const healthy = await pingDatabase()
  const body = {
    status: healthy ? 'ok' : 'degraded',
    server: 'running',
    mongodb: healthy ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV ?? 'development',
    commit: process.env.GITHUB_SHA ?? process.env.VERCEL_GIT_COMMIT_SHA ?? 'dev',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  }

  return Response.json(body, { status: healthy ? 200 : 503 })
}
