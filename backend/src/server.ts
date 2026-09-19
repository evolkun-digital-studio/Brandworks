import type { Server } from 'node:http'
import { createApp } from './app.js'
import { env } from './config/env.js'
import { connectToDatabase, disconnectFromDatabase } from './config/database.js'
import { ensureAdminIndexes } from './repositories/admin.repository.js'
import { ensureBlogIndexes } from './repositories/blog.repository.js'
import { startBlogScheduler, stopBlogScheduler } from './services/blog/scheduler.service.js'

async function main() {
  // Connect to MongoDB first — the server does not start accepting
  // requests unless this succeeds, so a running process always implies
  // a live database connection.
  try {
    await connectToDatabase()
    await ensureAdminIndexes()
    await ensureBlogIndexes()
    console.log('MongoDB connected')
  } catch (error) {
    console.error(
      '[brandworks-backend] failed to connect to MongoDB:',
      error instanceof Error ? error.message : error,
    )
    process.exit(1)
  }

  const app = createApp()

  const server = app.listen(env.port, () => {
    console.log(`Server running on http://localhost:${env.port}`)
  })

  // Phase 14 — backend-authoritative scheduled publishing. Started
  // only once the server is actually accepting requests, and stopped
  // as part of the same graceful-shutdown sequence as everything else.
  startBlogScheduler()

  registerShutdownHandlers(server)
}

function registerShutdownHandlers(server: Server) {
  let shuttingDown = false

  const shutdown = (signal: string) => {
    if (shuttingDown) return
    shuttingDown = true

    console.log(`[brandworks-backend] received ${signal}, shutting down...`)

    stopBlogScheduler()

    server.close(() => {
      disconnectFromDatabase()
        .then(() => {
          console.log('[brandworks-backend] MongoDB connection closed')
          process.exit(0)
        })
        .catch((error) => {
          console.error(
            '[brandworks-backend] error while closing MongoDB connection:',
            error instanceof Error ? error.message : error,
          )
          process.exit(1)
        })
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

main()
