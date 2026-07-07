import type { NextFunction, Request, RequestHandler, Response } from 'express'

import type { Role } from '@modules/users/enum/role.enum'
import { AppError } from '@shared/errors/app-error'

/**
 * RBAC: libera a rota apenas para os papéis informados. Deve rodar depois de
 * `authenticate` (que popula req.user).
 */
export function authorize(...roles: Role[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw AppError.unauthorized()
    }

    if (!roles.includes(req.user.role)) {
      throw AppError.insufficientRole()
    }

    next()
  }
}
