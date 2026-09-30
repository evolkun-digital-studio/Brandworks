import type { Request, Response } from 'express'
import { pingDatabase } from '../config/database.js'
import { env } from '../config/env.js'
import { buildInfo } from '../lib/buildInfo.js'

/**
 * Liveness/readiness signal for the backend. Distinguishes "the Express
 * process is running" from "MongoDB is currently reachable" — the server
 * only ever starts after an initial successful connection (see server.ts),
 * but this re-checks live so a connection dropped later is reflected too.
 *
 * Also what the deploy pipeline polls after a release: `commit` lets
 * it confirm the process answering is the build it just shipped, and
 * `uptime` that it actually restarted. Everything here is safe to be
 * public — no hostnames, connection details, versions of dependencies
 * or configuration values.
 */
export async function getHealth(_req: Request, res: Response) {
  const mongoConnected = await pingDatabase()

  res.status(mongoConnected ? 200 : 503).json({
    status: mongoConnected ? 'ok' : 'degraded',
    server: 'running',
    mongodb: mongoConnected ? 'connected' : 'disconnected',
    environment: env.nodeEnv,
    commit: buildInfo.commit,
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
}
