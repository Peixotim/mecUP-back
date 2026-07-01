import { randomUUID } from 'node:crypto'

import type { Request, Response, NextFunction } from 'express'

import { logger } from '@shared/logger/logger'

const REQUEST_ID_HEADER = 'x-request-id'

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const incomingId = req.headers[REQUEST_ID_HEADER]
  const requestId = (Array.isArray(incomingId) ? incomingId[0] : incomingId) ?? randomUUID()

  req.id = requestId
  req.log = logger.child({ requestId })

  res.setHeader(REQUEST_ID_HEADER, requestId)

  const startedAt = process.hrtime.bigint()

  req.log.info({ method: req.method, url: req.originalUrl }, 'request received')

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    req.log.info(
      {
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Math.round(durationMs * 100) / 100,
      },
      'request completed',
    )
  })

  next()
}
