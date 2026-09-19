import type { Request, Response } from 'express'
import { pingDatabase } from '../config/database.js'

/**
 * Liveness/readiness signal for the backend. Distinguishes "the Express
 * process is running" from "MongoDB is currently reachable" — the server
 * only ever starts after an initial successful connection (see server.ts),
 * but this re-checks live so a connection dropped later is reflected too.
 */
export async function getHealth(_req: Request, res: Response) {
  const mongoConnected = await pingDatabase()

  res.status(mongoConnected ? 200 : 503).json({
    status: mongoConnected ? 'ok' : 'degraded',
    server: 'running',
    mongodb: mongoConnected ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  })
}
