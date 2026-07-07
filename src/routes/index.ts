import { Router } from 'express'
import type { Request, Response } from 'express'

import { authRoutes } from '@modules/auth/routes/auth.routes'
import { checkReadiness } from '@shared/health/health.checks'

/**
 * Composition root das rotas: monta todos os routers de feature em um só lugar.
 * Cada módulo é dono do seu próprio router; aqui apenas atribuímos o path base.
 */
export function createRoutes(): Router {
  const router = Router()

  // Liveness
  router.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'MECUP API',
      version: '1.0.0',
      status: 'OK',
      timestamp: new Date().toISOString(),
    })
  })

  // Readiness
  router.get('/health/ready', async (req: Request, res: Response) => {
    const { healthy, dependencies } = await checkReadiness()

    if (!healthy) {
      req.log.warn({ dependencies }, 'readiness check failed')
    }

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'READY' : 'UNAVAILABLE',
      timestamp: new Date().toISOString(),
      dependencies,
    })
  })

  router.use('/auth', authRoutes())

  return router
}
