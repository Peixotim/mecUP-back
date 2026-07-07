import type { Request, Response } from 'express'

import type { LoginInput, RefreshTokenInput } from '../dto/auth.dto'
import { AuthService } from '../service/auth.service'

export class AuthController {
  constructor(private readonly auth = new AuthService()) {}

  public async login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body as LoginInput
    const tokens = await this.auth.login(email, password)
    res.status(200).json(tokens)
  }

  public async refresh(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenInput
    const tokens = await this.auth.refresh(refreshToken)
    res.status(200).json(tokens)
  }

  public async logout(req: Request, res: Response): Promise<void> {
    const { refreshToken } = req.body as RefreshTokenInput
    await this.auth.logout(refreshToken)
    res.status(204).send()
  }
}
