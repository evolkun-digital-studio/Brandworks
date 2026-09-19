import { MongoClient } from 'mongodb'
import type { Db } from 'mongodb'
import { env } from './env.js'
import { toSafeErrorMessage } from '../lib/safeError.js'

/**
 * Singleton MongoDB client/connection.
 *
 * Nothing here creates collections, schemas, or app-specific queries —
 * this module only owns the lifecycle of the connection itself so that
 * future services/controllers can `import { getDb } from '../config/database.js'`
 * without each one opening its own connection.
 */

let client: MongoClient | null = null
let db: Db | null = null
let connectPromise: Promise<Db> | null = null

/**
 * Connects to MongoDB if not already connected/connecting, and returns
 * the Db handle. Safe to call multiple times — concurrent callers share
 * the same in-flight connection attempt instead of opening new ones.
 */
export function connectToDatabase(): Promise<Db> {
  if (db) {
    return Promise.resolve(db)
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      const uri = env.mongoUri
      const nextClient = new MongoClient(uri)

      try {
        await nextClient.connect()
        // Confirms the connection is actually usable, not just "opened".
        await nextClient.db().command({ ping: 1 })
      } catch (error) {
        connectPromise = null
        await nextClient.close().catch(() => undefined)
        throw new Error(
          `MongoDB connection failed: ${toSafeErrorMessage(error)}`,
        )
      }

      client = nextClient
      // No db name in the URI path defaults to the driver's default db;
      // callers can pass a name to client.db('name') later if needed.
      db = nextClient.db()
      return db
    })()
  }

  return connectPromise
}

/**
 * Returns the already-connected Db handle. Throws if called before
 * `connectToDatabase()` has resolved — callers should only reach for
 * this after server startup has confirmed the connection.
 */
export function getDb(): Db {
  if (!db) {
    throw new Error(
      'MongoDB is not connected yet. Call connectToDatabase() during startup before using getDb().',
    )
  }
  return db
}

/** True once a live MongoDB connection has been established. */
export function isDatabaseConnected(): boolean {
  return db !== null
}

/**
 * Actively checks the current connection with a lightweight ping,
 * rather than only trusting the cached "connected" flag. Used by the
 * health endpoint so a dropped connection is reflected in real time.
 */
export async function pingDatabase(): Promise<boolean> {
  if (!client || !db) return false
  try {
    await db.command({ ping: 1 })
    return true
  } catch {
    return false
  }
}

/** Closes the MongoDB connection, e.g. on process shutdown. */
export async function disconnectFromDatabase(): Promise<void> {
  if (!client) return
  await client.close()
  client = null
  db = null
  connectPromise = null
}
