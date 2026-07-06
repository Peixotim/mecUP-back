import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid') id!: string
  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date
  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' }) updatedAt!: Date
  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz' }) deletedAt?: Date
}

export abstract class TenantEntity extends BaseEntity {
  @Index()
  @Column({ name: 'workshop_id', type: 'uuid' })
  workshopId!: string
}
