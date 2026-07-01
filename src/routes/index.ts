import { Router } from 'express'
import type { Request, Response } from 'express'

import { checkReadiness } from '@shared/health/health.checks'

const routes: Router = Router()

// Liveness
routes.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    name: 'MECUP API',
    version: '1.0.0',
    status: 'OK',
    timestamp: new Date().toISOString(),
  })
})

// Readiness
routes.get('/health/ready', async (req: Request, res: Response) => {
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

export default routes
