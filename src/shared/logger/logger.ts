import { pino } from 'pino'
import type { Logger, LoggerOptions } from 'pino'

import { env } from '@config/env'

const isProduction = env.NODE_ENV === 'production'

const options: LoggerOptions = {
  level: env.LOG_LEVEL,
  timestamp: pino.stdTimeFunctions.isoTime,

  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie'],
    remove: true,
  },
  ...(isProduction
    ? {}
    : {
        transport: {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },
      }),
}

export const logger: Logger = pino(options)
