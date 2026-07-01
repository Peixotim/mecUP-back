import type { Request, Response, NextFunction } from 'express'

import { AppError } from '@shared/errors/app-error'

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json(error.toJSON())
    return
  }

  console.error('[errorHandler] Unhandled error:', error)

  res.status(AppError.internal().statusCode).json(AppError.internal().toJSON())
}
