import type { Server } from 'node:http'
import { createApp } from './app.js'
import { assertStartupConfig, env } from './config/env.js'
import { connectToDatabase, disconnectFromDatabase } from './config/database.js'
import { buildInfo } from './lib/buildInfo.js'
import { describeError, logger } from './lib/logger.js'
import { toSafeErrorMessage } from './lib/safeError.js'
import { ensureAdminIndexes } from './repositories/admin.repository.js'
import { ensureBlogIndexes } from './repositories/blog.repository.js'
import { startBlogScheduler, stopBlogScheduler } from './services/blog/scheduler.service.js'

async function main() {
  // Fail on a missing/invalid required setting now, with a clear
  // message, rather than on whichever request first happens to need it.
  try {
    for (const warning of assertStartupConfig()) {
      logger.warn(`configuration: ${warning}`)
    }
  } catch (error) {
    logger.error(`invalid configuration: ${toSafeErrorMessage(error)}`)
    process.exit(1)
  }

  // Connect to MongoDB first — the server does not start accepting
  // requests unless this succeeds, so a running process always implies
  // a live database connection.
  try {
    await connectToDatabase()
    await ensureAdminIndexes()
    await ensureBlogIndexes()
    logger.info('MongoDB connected')
  } catch (error) {
    logger.error(`failed to connect to MongoDB: ${toSafeErrorMessage(error)}`)
    process.exit(1)
  }

  const app = createApp()

  // env.port is the local-development port; under cPanel/Passenger the
  // listen call is intercepted and bound to Passenger's own socket, so
  // the number is whatever the host supplies.
  const server = app.listen(env.port, () => {
    logger.info(`server listening port=${env.port} env=${env.nodeEnv} commit=${buildInfo.commit}`)
  })

  server.on('error', (error) => {
    logger.error(`server failed to listen: ${describeError(error)}`)
    process.exit(1)
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

    logger.info(`received ${signal}, shutting down`)

    stopBlogScheduler()

    server.close(() => {
      disconnectFromDatabase()
        .then(() => {
          logger.info('MongoDB connection closed')
          process.exit(0)
        })
        .catch((error) => {
          logger.error(`error while closing MongoDB connection: ${toSafeErrorMessage(error)}`)
          process.exit(1)
        })
    })
  }

  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

// A rejected promise nothing awaited is a bug, but not one worth
// taking the whole site down for — record it and keep serving.
process.on('unhandledRejection', (reason) => {
  logger.error(`unhandled promise rejection: ${describeError(reason)}`)
})

main().catch((error) => {
  logger.error(`startup failed: ${describeError(error)}`)
  process.exit(1)
})
