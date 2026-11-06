import 'server-only'

import { MongoClient, type Db } from 'mongodb'
import { requireMongoUri } from '../config/env'
import { ensureDatabaseIndexes } from './indexes'

type MongoGlobal = typeof globalThis & {
  __brandworksMongoClientPromise?: Promise<MongoClient>
  __brandworksMongoDbPromise?: Promise<Db>
}

const mongoGlobal = globalThis as MongoGlobal

function getClientPromise(): Promise<MongoClient> {
  if (mongoGlobal.__brandworksMongoClientPromise) {
    return mongoGlobal.__brandworksMongoClientPromise
  }

  const client = new MongoClient(requireMongoUri())
  const pending: Promise<MongoClient> = client.connect()
    .then(async (connectedClient) => {
      try {
        await connectedClient.db().command({ ping: 1 })
        return connectedClient
      } catch (error) {
        await connectedClient.close().catch(() => undefined)
        throw error
      }
    })
    .catch((error: unknown) => {
      if (mongoGlobal.__brandworksMongoClientPromise === pending) {
        mongoGlobal.__brandworksMongoClientPromise = undefined
      }
      throw error
    })

  mongoGlobal.__brandworksMongoClientPromise = pending
  return pending
}

/** Reuses one connected client and initializes indexes once per warm process. */
export function getDatabase(): Promise<Db> {
  if (mongoGlobal.__brandworksMongoDbPromise) {
    return mongoGlobal.__brandworksMongoDbPromise
  }

  const pending: Promise<Db> = getClientPromise()
    .then(async (client) => {
      const db = client.db()
      await ensureDatabaseIndexes(db)
      return db
    })
    .catch((error: unknown) => {
      if (mongoGlobal.__brandworksMongoDbPromise === pending) {
        mongoGlobal.__brandworksMongoDbPromise = undefined
      }
      throw error
    })

  mongoGlobal.__brandworksMongoDbPromise = pending
  return pending
}

export async function pingDatabase(): Promise<boolean> {
  try {
    const db = await getDatabase()
    await db.command({ ping: 1 })
    return true
  } catch {
    return false
  }
}
