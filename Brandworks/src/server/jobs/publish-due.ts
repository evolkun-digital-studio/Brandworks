import envPackage from '@next/env'
import { MongoClient } from 'mongodb'
import { publishDueScheduledDocuments } from '../repositories/blog-jobs'

const { loadEnvConfig } = envPackage

async function run() {
  loadEnvConfig(process.cwd())
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) throw new Error('MONGODB_URI is required.')

  const client = new MongoClient(uri)
  try {
    await client.connect()
    const db = client.db()
    await db.command({ ping: 1 })
    const publishedCount = await publishDueScheduledDocuments(db, new Date())
    console.log(JSON.stringify({ job: 'publish-due', status: 'ok', publishedCount }))
  } finally {
    await client.close().catch(() => undefined)
  }
}

run().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : 'Error'
  console.error(JSON.stringify({ job: 'publish-due', status: 'failed', error: errorName }))
  process.exitCode = 1
})
