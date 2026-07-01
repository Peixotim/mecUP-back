import type { Request, Response, NextFunction } from 'express'

import { env } from '@config/env'
import { AppError } from '@shared/errors/app-error'
import { redis } from '@shared/redis/redis'

export async function rateLimitHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const ip = req.ip

    if (!ip) {
      throw AppError.badRequest('Unable to identify request origin')
    }

    const key = `rate-limit:${ip}`

    const requestCount = await redis.incr(key)

    if (requestCount === 1) {
      await redis.expire(key, env.RATE_LIMIT_WINDOW)
    }

    const remaining = Math.max(env.RATE_LIMIT_MAX - requestCount, 0)
    res.setHeader('X-RateLimit-Limit', env.RATE_LIMIT_MAX)
    res.setHeader('X-RateLimit-Remaining', remaining)

    if (requestCount > env.RATE_LIMIT_MAX) {
      const retryAfter = await redis.ttl(key)
      res.setHeader('Retry-After', retryAfter > 0 ? retryAfter : env.RATE_LIMIT_WINDOW)
      throw AppError.tooManyRequests()
    }

    next()
  } catch (error) {
    next(error)
  }
}
