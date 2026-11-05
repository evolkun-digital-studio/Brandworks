import envPackage from '@next/env'
import { MongoClient } from 'mongodb'

async function run() {
  envPackage.loadEnvConfig(process.cwd())
  const { migrateEditorialContent, repairMigratedEditorialImages } = await import('../services/migrate-editorial')
  const uri = process.env.MONGODB_URI?.trim()
  if (!uri) throw new Error('MONGODB_URI is required.')
  const client = new MongoClient(uri)
  try {
    await client.connect()
    // Reuse the existing CMS collection and its unique slug constraint.
    await client.db().collection('blogs').createIndex({ slug: 1 }, { unique: true })
    const results = await migrateEditorialContent(client.db(), process.argv.includes('--dry-run'))
    for (const result of results) console.log(JSON.stringify(result))
    console.log(JSON.stringify({ total: results.length, inserted: results.filter((r) => r.status === 'inserted').length }))
    if (process.argv.includes('--repair-image-urls') && !process.argv.includes('--dry-run')) {
      console.log(JSON.stringify({ repairedImages: await repairMigratedEditorialImages(client.db()) }))
    }
  } finally {
    await client.close()
  }
}

run().catch((error: unknown) => { console.error(error instanceof Error ? error.message : 'Migration failed.'); process.exitCode = 1 })
