import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'

import type { Role } from '@modules/users/enum/role.enum'
import { UserRepository } from '@modules/users/repository/user.repository'
import { AppError } from '@shared/errors/app-error'

import { RefreshTokenRepository } from '../repository/refresh-token.repository'

import { ArgonService } from './argon.service'
import { TokenService } from './token.service'

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export class AuthService {
  constructor(
    private readonly users = new UserRepository(),
    private readonly refreshTokens = new RefreshTokenRepository(),
    private readonly tokens = new TokenService(),
    private readonly argon = new ArgonService(),
  ) {}

  public async login(email: string, password: string): Promise<AuthTokens> {
    const user = await this.users.findByEmailWithPassword(email)

    if (!user) {
      throw AppError.invalidCredentials()
    }

    if (!user.active) {
      throw AppError.invalidCredentials()
    }

    const passwordOk = await this.argon.verify(user.passwordHash, password)

    if (!passwordOk) {
      throw AppError.invalidCredentials()
    }

    return this.issueTokens(user.id, user.workshopId, user.role, randomUUID())
  }

  public async refresh(refreshToken: string): Promise<AuthTokens> {
    const claims = this.tokens.verifyRefresh(refreshToken)
    const stored = await this.refreshTokens.findById(claims.tokenId)

    if (!stored) {
      throw AppError.invalidToken()
    }

    // Reuso de um token já rotacionado: revoga a família inteira (encerra todas as sessões).
    if (stored.revokedAt) {
      await this.refreshTokens.revokeFamily(stored.familyId)
      throw AppError.invalidToken()
    }

    if (!this.matchesHash(refreshToken, stored.tokenHash)) {
      await this.refreshTokens.revokeFamily(stored.familyId)
      throw AppError.invalidToken()
    }

    const user = await this.users.findById(stored.userId)

    if (!user?.active) {
      throw AppError.invalidToken()
    }

    // Rotação: revoga o atual e emite um novo na MESMA família.
    await this.refreshTokens.revoke(stored.id)

    return this.issueTokens(user.id, user.workshopId, user.role, stored.familyId)
  }

  public async logout(refreshToken: string): Promise<void> {
    const claims = this.tokens.verifyRefresh(refreshToken)
    await this.refreshTokens.revoke(claims.tokenId)
  }

  private async issueTokens(
    userId: string,
    workshopId: string,
    role: Role,
    familyId: string,
  ): Promise<AuthTokens> {
    const accessToken = this.tokens.signAccess({ sub: userId, workshopId, role })

    const tokenId = randomUUID()
    const refreshToken = this.tokens.signRefresh({ sub: userId, tokenId })
    // exp é autoritativo (vem do próprio JWT); expiresAt no banco é para consulta/limpeza.
    const { exp } = this.tokens.verifyRefresh(refreshToken)

    await this.refreshTokens.create({
      id: tokenId,
      userId,
      familyId,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(exp * 1000),
    })

    return { accessToken, refreshToken }
  }

  private matchesHash(token: string, storedHash: string): boolean {
    const computed = Buffer.from(hashToken(token), 'hex')
    const stored = Buffer.from(storedHash, 'hex')

    return computed.length === stored.length && timingSafeEqual(computed, stored)
  }
}
