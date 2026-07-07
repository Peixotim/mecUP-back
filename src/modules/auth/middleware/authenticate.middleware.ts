import type { Request, Response, NextFunction } from 'express'

import { AppError } from '@shared/errors/app-error'

import { TokenService } from '../service/token.service'

const tokenService = new TokenService()
const BEARER_PREFIX = 'Bearer '

/**
 * Lê o Authorization Bearer, valida o Access Token e popula req.user e
 * req.workshopId. A workshop vem SEMPRE do token — nunca do body/query/URL.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization

  if (!header?.startsWith(BEARER_PREFIX)) {
    throw AppError.unauthorized()
  }

  const token = header.slice(BEARER_PREFIX.length).trim()
  const claims = tokenService.verifyAccess(token)

  req.user = { sub: claims.sub, workshopId: claims.workshopId, role: claims.role }
  req.workshopId = claims.workshopId

  next()
}
