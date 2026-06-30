import { once } from 'node:events'
import http from 'node:http'
import type { Server } from 'node:http'
import { promisify } from 'node:util'

import { env } from '@config/env'

import { createApp } from './app'

// Tempo máximo (ms) que esperamos as conexões em andamento fecharem antes de forçar a saída.
const SHUTDOWN_TIMEOUT_MS = 10_000

// Encerramento ordeiro: para de aceitar novas conexões, espera as em andamento
// terminarem e só então sai. Um timeout de segurança evita ficar pendurado para sempre.
function setupGracefulShutdown(server: Server): void {
  const closeServer = promisify<void>(server.close.bind(server))
  let shuttingDown = false

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true
    console.info(`\n${signal} received. Closing server gracefully...`)

    const forceExit = setTimeout(() => {
      console.error(`Could not close connections in ${SHUTDOWN_TIMEOUT_MS}ms. Forcing shutdown.`)
      process.exit(1)
    }, SHUTDOWN_TIMEOUT_MS)

    forceExit.unref()

    try {
      await closeServer()

      // Aqui entram os fechamentos de recursos no futuro:
      //   await AppDataSource.destroy() (TypeORM)
      //   await redis.quit() (Redis)

      console.info('Server closed successfully.')
      process.exit(0)
    } catch (error) {
      console.error('Error while closing server:', error)
      process.exit(1)
    } finally {
      clearTimeout(forceExit)
    }
  }

  process.on('SIGTERM', () => void shutdown('SIGTERM'))
  process.on('SIGINT', () => void shutdown('SIGINT'))
}

export async function startServer(): Promise<Server> {
  // Aqui entram as conexões de infraestrutura no futuro:
  //   await AppDataSource.initialize() (TypeORM)
  //   await redis.connect() (Redis)

  const app = createApp()
  const server = http.createServer(app)

  server.listen(env.API_PORT)
  await once(server, 'listening')

  console.info(`Server is running on port ${env.API_PORT}`)

  setupGracefulShutdown(server)

  return server
}

async function bootstrap(): Promise<void> {
  try {
    await startServer()
  } catch (error) {
    console.error('Failed to start application:', error)
    process.exit(1)
  }
}

void bootstrap()
