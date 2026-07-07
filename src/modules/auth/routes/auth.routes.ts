import { Router } from 'express'

import { validate } from '@shared/middlewares/validate.middleware'

import { AuthController } from '../controller/auth.controller'
import { loginSchema, refreshTokenSchema } from '../dto/auth.dto'

export function authRoutes(): Router {
  const router = Router()
  const controller = new AuthController()

  router.post('/login', validate({ body: loginSchema }), controller.login.bind(controller))
  router.post(
    '/refresh',
    validate({ body: refreshTokenSchema }),
    controller.refresh.bind(controller),
  )
  router.post('/logout', validate({ body: refreshTokenSchema }), controller.logout.bind(controller))

  return router
}
