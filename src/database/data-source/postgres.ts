import { DataSource } from 'typeorm'

import { env } from '@config/env'
import { logger } from '@shared/logger/logger'

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: env.POSTGRES_HOST,
  username: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
  database: env.POSTGRES_DB,
  port: env.POSTGRES_PORT,
  synchronize: false,
  logging: env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  entities: ['src/modules/**/*.entity.{ts,js}'],
  migrations: ['src/database/migrations/*.{ts,js}'],
  extra: { max: env.DB_POOL_MAX ?? 10, connectionTimeoutMillis: 5000 },
})

export async function connectPostgres(): Promise<void> {
  await AppDataSource.initialize()
  logger.info('[postgres] connection ready')
}

export async function disconnectPostgres(): Promise<void> {
  await AppDataSource.destroy()
}

export async function pingPostgres(): Promise<void> {
  await AppDataSource.query('SELECT 1')
}
