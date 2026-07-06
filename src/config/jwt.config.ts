import type { SignOptions } from 'jsonwebtoken'

import { env } from '@config/env'

export const jwtConfig = {
  access: {
    secret: env.JWT_ACCESS_SECRET,
    signOptions: {
      expiresIn: env.JWT_ACCESS_TTL as SignOptions['expiresIn'],
    } satisfies SignOptions,
  },
  refresh: {
    secret: env.JWT_REFRESH_SECRET,
    signOptions: {
      expiresIn: env.JWT_REFRESH_TTL as SignOptions['expiresIn'],
    } satisfies SignOptions,
  },
}
