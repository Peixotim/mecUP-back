import argon2 from 'argon2'

import { argonOptions } from '@config/argon.config'
import { AppError } from '@shared/errors/app-error'

export class ArgonService {
  constructor(private readonly options = argonOptions) {}
  public async hash(password: string): Promise<string> {
    try {
      return await argon2.hash(password, this.options)
    } catch (err) {
      throw AppError.passwordHashFailed(err)
    }
  }

  public async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password)
    } catch (err) {
      throw AppError.passwordVerifyFailed(err)
    }
  }
}
