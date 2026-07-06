import { Column, Entity, Unique } from 'typeorm'

import { TenantEntity } from '@database/entity/base.entity'

import { Role } from '../enum/role.enum'

@Entity('users')
@Unique(['workshopId', 'email'])
export class User extends TenantEntity {
  @Column({ type: 'varchar' })
  name!: string

  @Column({ type: 'varchar' })
  email!: string

  @Column({ name: 'password_hash', type: 'varchar', select: false })
  passwordHash!: string

  @Column({ type: 'varchar', nullable: true })
  phone?: string

  @Column({ type: 'enum', enum: Role })
  role!: Role

  @Column({ type: 'boolean', default: true })
  active!: boolean
}
