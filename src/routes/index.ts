import { Router } from 'express'
import type { Request, Response } from 'express'

const routes: Router = Router()

//Adicionar logo abaixo tambem os dados da database
routes.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'mecUp API',
    version: '1.0.0',
    status: 'ok',
  })
})

export default routes
