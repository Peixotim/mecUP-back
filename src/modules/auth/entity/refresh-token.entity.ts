import { Column, Entity, Index } from 'typeorm'

import { BaseEntity } from '@database/entity/base.entity'

@Entity('refresh_tokens')
export class RefreshToken extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string

  // Agrupa a cadeia de tokens rotacionados de uma mesma sessão de login.
  // No reuso de um token revogado, toda a família é revogada.
  @Index()
  @Column({ name: 'family_id', type: 'uuid' })
  familyId!: string

  // SHA-256 do refresh token — nunca armazenado em texto puro.
  @Column({ name: 'token_hash', type: 'varchar' })
  tokenHash!: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt?: Date
}
