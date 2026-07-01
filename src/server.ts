import 'reflect-metadata'

import { once } from 'node:events'
import http from 'node:http'
import type { Server } from 'node:http'
import { promisify } from 'node:util'

import { env } from '@config/env'
import { connectPostgres, disconnectPostgres } from '@database/data-source/postgres'
import { logger } from '@shared/logger/logger'
import { connectRedis, disconnectRedis } from '@shared/redis/redis'

import { createApp } from './app'

const SHUTDOWN_TIMEOUT_MS = 10_000

function setupGracefulShutdown(server: Server): void {
  const closeServer = promisify<void>(server.close.bind(server))
  let shuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    logger.info(`${signal} received. Closing server gracefully...`)

    const forceExit = setTimeout(() => {
      logger.error(`Could not close connections in ${SHUTDOWN_TIMEOUT_MS}ms. Forcing shutdown.`)
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)

    forceExit.unref()

    try {
      await closeServer()

      await Promise.all([disconnectRedis(), disconnectPostgres()])

      logger.info('Server closed successfully.')
      process.exit(0)
    } catch (error) {
      logger.error({ err: error }, 'Error while closing server')
      process.exit(1)
    } finally {
      clearTimeout(forceExit)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

export async function startServer(): Promise<Server> {
  await Promise.all([connectRedis(), connectPostgres()])

  const app = createApp()
  const server = http.createServer(app)

  server.listen(env.API_PORT)
  await once(server, 'listening')

  logger.info(`Server is running on port ${env.API_PORT}`)

  setupGracefulShutdown(server)

  return server
}

async function bootstrap(): Promise<void> {
  try {
    await startServer()
  } catch (error) {
    logger.error({ err: error }, 'Failed to start application')
    process.exit(1)
  }
}

void bootstrap()
