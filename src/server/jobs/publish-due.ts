import envPackage from '@next/env'
import { MongoClient } from 'mongodb'
import { publishDueScheduledDocuments } from '../repositories/blog-jobs'
import { recordPublishDueJobRun } from '../repositories/job-status'

const { loadEnvConfig } = envPackage

async function run() {
  loadEnvConfig(process.cwd())
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) throw new Error('MONGODB_URI is required.')

  const client = new MongoClient(uri)
  let db
  const runAt = new Date()
  try {
    await client.connect()
    db = client.db()
    await db.command({ ping: 1 })
    const publishedCount = await publishDueScheduledDocuments(db, runAt)
    await recordPublishDueJobRun(db, { status: 'ok', runAt, publishedCount })
    console.log(JSON.stringify({ job: 'publish-due', status: 'ok', publishedCount }))
  } catch (error) {
    if (db) {
      await recordPublishDueJobRun(db, {
        status: 'failed',
        runAt,
        publishedCount: 0,
        error: error instanceof Error ? error.name : 'Error',
      }).catch(() => undefined)
    }
    throw error
  } finally {
    await client.close().catch(() => undefined)
  }
}

run().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : 'Error'
  console.error(JSON.stringify({ job: 'publish-due', status: 'failed', error: errorName }))
  process.exitCode = 1
})
