import jwt, { type JwtPayload } from 'jsonwebtoken'

import { jwtConfig } from '@config/jwt.config'
import { AppError } from '@shared/errors/app-error'

import {
  accessClaimsSchema,
  refreshClaimsSchema,
  type AccessClaims,
  type AccessTokenPayload,
  type RefreshClaims,
  type RefreshTokenPayload,
} from '../dto/token.dto'

export class TokenService {
  public signAccess(payload: AccessTokenPayload): string {
    return jwt.sign(payload, jwtConfig.access.secret, jwtConfig.access.signOptions)
  }

  public signRefresh(payload: RefreshTokenPayload): string {
    return jwt.sign(payload, jwtConfig.refresh.secret, jwtConfig.refresh.signOptions)
  }

  public verifyAccess(token: string): AccessClaims {
    const payload = this.verifySignature(token, jwtConfig.access.secret)
    const claims = accessClaimsSchema.safeParse(payload)

    if (!claims.success) {
      throw AppError.invalidToken()
    }

    return claims.data
  }

  public verifyRefresh(token: string): RefreshClaims {
    const payload = this.verifySignature(token, jwtConfig.refresh.secret)
    const claims = refreshClaimsSchema.safeParse(payload)

    if (!claims.success) {
      throw AppError.invalidToken()
    }

    return claims.data
  }

  private verifySignature(token: string, secret: string): string | JwtPayload {
    try {
      return jwt.verify(token, secret)
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw AppError.tokenExpired()
      }

      throw AppError.invalidToken()
    }
  }
}
