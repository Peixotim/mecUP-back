import type { Logger } from 'pino'

import type { Role } from '@modules/users/enum/role.enum'

declare global {
  namespace Express {
    interface Request {
      id: string
      log: Logger
      workshopId?: string
      user?: {
        sub: string
        workshopId: string
        role: Role
      }
    }
  }
}

export {}
