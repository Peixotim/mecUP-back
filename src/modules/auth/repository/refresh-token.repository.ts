import { IsNull } from 'typeorm'

import { AppDataSource } from '@database/data-source/postgres'

import { RefreshToken } from '../entity/refresh-token.entity'

export interface CreateRefreshTokenInput {
  id: string
  userId: string
  familyId: string
  tokenHash: string
  expiresAt: Date
}

export class RefreshTokenRepository {
  private readonly repo = AppDataSource.getRepository(RefreshToken)

  public create(input: CreateRefreshTokenInput): Promise<RefreshToken> {
    return this.repo.save(this.repo.create(input))
  }

  public findById(id: string): Promise<RefreshToken | null> {
    return this.repo.findOne({ where: { id } })
  }

  public async revoke(id: string): Promise<void> {
    await this.repo.update({ id, revokedAt: IsNull() }, { revokedAt: new Date() })
  }

  public async revokeFamily(familyId: string): Promise<void> {
    await this.repo.update({ familyId, revokedAt: IsNull() }, { revokedAt: new Date() })
  }
}
