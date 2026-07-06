import { Column, Entity } from 'typeorm'

import { BaseEntity } from '@database/entity/base.entity'

@Entity('workshops')
export class Workshop extends BaseEntity {
  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar', unique: true, nullable: true })
  cnpj?: string

  @Column({ type: 'varchar', nullable: true })
  phone?: string

  @Column({ type: 'varchar', nullable: true })
  address?: string

  @Column({ name: 'logo_url', type: 'varchar', nullable: true })
  logoUrl?: string

  @Column({ type: 'jsonb', default: {} })
  settings!: Record<string, unknown>
}
