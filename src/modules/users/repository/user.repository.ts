import { AppDataSource } from '@database/data-source/postgres'

import { User } from '../entity/user.entity'

export class UserRepository {
  private readonly repo = AppDataSource.getRepository(User)

  // Login precisa do passwordHash, que é select:false por padrão na entidade.
  public findByEmailWithPassword(email: string): Promise<User | null> {
    return this.repo
      .createQueryBuilder('user')
      .addSelect('user.passwordHash')
      .where('user.email = :email', { email })
      .getOne()
  }

  public findById(id: string): Promise<User | null> {
    return this.repo.findOne({ where: { id } })
  }

  public findByEmail(email: string): Promise<User | null> {
    return this.repo.findOne({ where: { email } })
  }
}
