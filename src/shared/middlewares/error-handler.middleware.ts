import type { Request, Response, NextFunction } from 'express'

import { AppError } from '@shared/errors/app-error'
import { logger } from '@shared/logger/logger'

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const log = req.log ?? logger

  if (error instanceof AppError) {
    if (error.statusCode >= 500) {
      log.error({ err: error, code: error.code }, error.message)
    }

    res.status(error.statusCode).json(error.toJSON())
    return
  }

  log.error({ err: error }, 'Unhandled error')

  const internal = AppError.internal()
  res.status(internal.statusCode).json(internal.toJSON())
}
