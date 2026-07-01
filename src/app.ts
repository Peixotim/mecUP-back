import compression from 'compression'
import cors from 'cors'
import type { CorsOptions } from 'cors'
import express from 'express'
import type { Express } from 'express'
import helmet from 'helmet'

import { env } from '@config/env'
import { errorHandler } from '@shared/middlewares/error-handler.middleware'

import routes from './routes'

const corsOptions: CorsOptions = {
  origin: env.FRONTEND_URL,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: env.CORS_CREDENTIALS,
  maxAge: 600,
}

function parseTrustProxy(value: string): boolean | number | string {
  if (value === 'true') {
    return true
  }
  if (value === 'false') {
    return false
  }

  const hops = Number(value)
  if (Number.isInteger(hops) && hops >= 0) {
    return hops
  }

  return value
}

export function createApp(): Express {
  const app = express()

  app.set('trust proxy', parseTrustProxy(env.TRUST_PROXY))

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
        },
      },
      hsts:
        env.NODE_ENV === 'production'
          ? { maxAge: 31536000, includeSubDomains: true, preload: true }
          : false,
    }),
  )

  app.use(cors(corsOptions))

  app.use(compression())

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))
  app.use(routes)
  app.use(errorHandler)

  return app
}

export default createApp
