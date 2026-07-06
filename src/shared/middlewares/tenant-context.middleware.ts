import type { Request, Response, NextFunction } from 'express'

import { runWithTenant } from '@shared/database/tenant-context'
import { AppError } from '@shared/errors/app-error'

export function tenantContext(req: Request, _res: Response, next: NextFunction): void {
  const workshopId = req.workshopId

  if (!workshopId) {
    throw AppError.unauthorized('Tenant context missing')
  }

  runWithTenant(workshopId, next)
}
