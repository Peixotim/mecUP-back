import { Redis } from 'ioredis'
import type { RedisOptions } from 'ioredis'

import { env } from '@config/env'

const redisOptions: RedisOptions = {
  lazyConnect: true,
  password: env.REDIS_PASSWORD,
  retryStrategy: (attempt) => Math.min(attempt * 200, 2000),
}

export const redis = new Redis(env.REDIS_URL, redisOptions)

redis.on('ready', () => console.info('[redis] connection ready'))
redis.on('reconnecting', () => console.warn('[redis] reconnecting...'))
redis.on('close', () => console.warn('[redis] connection closed'))
redis.on('error', (error: Error) => console.error('[redis] error:', error.message))

export async function connectRedis(): Promise<void> {
  await redis.connect()
  await redis.ping()
}

export async function disconnectRedis(): Promise<void> {
  await redis.quit()
}

export async function pingRedis(): Promise<void> {
  await redis.ping()
}
