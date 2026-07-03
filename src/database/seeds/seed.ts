import { env } from '@config/env'
import { AppDataSource } from '@database/data-source/postgres'
import { logger } from '@shared/logger/logger'

import { SEED_PASSWORD } from './dataset'

import { resetSeeds, runSeeds } from './index'

type Mode = 'run' | 'reset'

function parseMode(): Mode {
  const arg = process.argv[2]

  if (arg === 'reset') {
    return 'reset'
  }

  if (arg === 'run' || arg === undefined) {
    return 'run'
  }

  logger.error(`[seed] modo inválido "${arg}". Use "run" ou "reset".`)
  process.exit(1)
}

async function main(): Promise<void> {
  if (env.NODE_ENV === 'production') {
    logger.error('[seed] recusado: seeds não rodam em produção (NODE_ENV=production).')
    process.exit(1)
  }

  const mode = parseMode()

  await AppDataSource.initialize()

  try {
    if (mode === 'reset') {
      await resetSeeds(AppDataSource)
    } else {
      await runSeeds(AppDataSource)
      logger.info(`[seed] usuários de exemplo usam a senha de dev: ${SEED_PASSWORD}`)
    }
  } finally {
    await AppDataSource.destroy()
  }
}

main().catch((error: unknown) => {
  logger.error({ err: error }, '[seed] falhou')
  process.exit(1)
})
