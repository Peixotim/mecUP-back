import type {
  DeepPartial,
  FindManyOptions,
  FindOneOptions,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from 'typeorm'

import { AppError } from '@shared/errors/app-error'

import { currentWorkshopId } from './tenant-context'

type ScopedManyOptions<T> = Omit<FindManyOptions<T>, 'where'> & {
  where?: FindOptionsWhere<T>
}

type ScopedOneOptions<T> = Omit<FindOneOptions<T>, 'where'> & {
  where?: FindOptionsWhere<T>
}

export abstract class TenantRepository<T extends ObjectLiteral> {
  protected constructor(protected readonly repo: Repository<T>) {}

  protected scopedWhere(where?: FindOptionsWhere<T>): FindOptionsWhere<T> {
    return { ...(where ?? {}), workshopId: currentWorkshopId() } as unknown as FindOptionsWhere<T>
  }

  private byId(id: string): FindOptionsWhere<T> {
    return this.scopedWhere({ id } as unknown as FindOptionsWhere<T>)
  }

  findAll(options?: ScopedManyOptions<T>): Promise<T[]> {
    return this.repo.find({ ...options, where: this.scopedWhere(options?.where) })
  }

  findOne(options: ScopedOneOptions<T>): Promise<T | null> {
    return this.repo.findOne({ ...options, where: this.scopedWhere(options.where) })
  }

  findById(id: string): Promise<T | null> {
    return this.repo.findOne({ where: this.byId(id) })
  }

  async findByIdOrFail(id: string): Promise<T> {
    const found = await this.findById(id)

    if (!found) {
      throw AppError.notFound()
    }

    return found
  }

  count(where?: FindOptionsWhere<T>): Promise<number> {
    return this.repo.count({ where: this.scopedWhere(where) })
  }

  exists(where?: FindOptionsWhere<T>): Promise<boolean> {
    return this.repo.exists({ where: this.scopedWhere(where) })
  }

  create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repo.create({
      ...data,
      workshopId: currentWorkshopId(),
    } as DeepPartial<T>)

    return this.repo.save(entity)
  }

  async update(id: string, data: DeepPartial<T>): Promise<T> {
    const entity = await this.findByIdOrFail(id)

    const safe = { ...(data as Record<string, unknown>) }
    delete safe.id
    delete safe.workshopId
    this.repo.merge(entity, safe as DeepPartial<T>)

    return this.repo.save(entity)
  }

  async softDelete(id: string): Promise<void> {
    const result = await this.repo.softDelete(this.byId(id))

    if (!result.affected) {
      throw AppError.notFound()
    }
  }
}
