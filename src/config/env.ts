import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Nível mínimo de log. Se não informado, cai no default por ambiente mais abaixo.
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),

  API_PORT: z.coerce
    .number({ message: 'API_PORT must be a valid number' })
    .int('API_PORT must be an integer')
    .positive('API_PORT must be a positive number')
    .default(8080),

  // Lista de origens confiáveis para CORS, separadas por vírgula (ex: "https://app.mecup.com,https://admin.mecup.com")
  FRONTEND_URL: z
    .string()
    .min(1, 'FRONTEND_URL is required')
    .transform((value) =>
      value
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),
    )
    .pipe(
      z
        .array(z.url('FRONTEND_URL must contain valid, comma-separated URL(s)'))
        .min(1, 'FRONTEND_URL must contain at least one URL'),
    ),

  // Habilita envio de cookies/credenciais nas respostas de CORS (exige origin explícito, nunca '*')
  CORS_CREDENTIALS: z.coerce.boolean().default(false),

  // Configuração do "trust proxy" do Express. Valores possíveis:
  TRUST_PROXY: z.string().default('false'),

  // PostgreSQL
  POSTGRES_USER: z.string().min(1, 'POSTGRES_USER is required'),
  POSTGRES_PASSWORD: z.string().min(1, 'POSTGRES_PASSWORD is required'),
  POSTGRES_DB: z.string().min(1, 'POSTGRES_DB is required'),
  POSTGRES_HOST: z.string().min(1, 'POSTGRES_HOST is required'),
  POSTGRES_PORT: z.coerce
    .number({ message: 'POSTGRES_PORT must be a valid number' })
    .int('POSTGRES_PORT must be an integer')
    .positive('POSTGRES_PORT must be a positive number')
    .default(5432),
  DATABASE_URL: z.url('DATABASE_URL must be a valid connection URL'),

  // Redis
  REDIS_PASSWORD: z.string().min(1, 'REDIS_PASSWORD is required'),
  REDIS_HOST: z.string().min(1, 'REDIS_HOST is required'),
  REDIS_PORT: z.coerce
    .number({ message: 'REDIS_PORT must be a valid number' })
    .int('REDIS_PORT must be an integer')
    .positive('REDIS_PORT must be a positive number')
    .default(6379),
  REDIS_URL: z.url('REDIS_URL must be a valid connection URL'),

  // Rate limit: janela em segundos e número máximo de requisições por janela/IP
  RATE_LIMIT_WINDOW: z.coerce
    .number({ message: 'RATE_LIMIT_WINDOW must be a valid number' })
    .int('RATE_LIMIT_WINDOW must be an integer')
    .positive('RATE_LIMIT_WINDOW must be a positive number')
    .default(60),
  RATE_LIMIT_MAX: z.coerce
    .number({ message: 'RATE_LIMIT_MAX must be a valid number' })
    .int('RATE_LIMIT_MAX must be an integer')
    .positive('RATE_LIMIT_MAX must be a positive number')
    .default(100),
})

type RawEnv = z.infer<typeof envSchema>
export type Env = Omit<RawEnv, 'LOG_LEVEL'> & { LOG_LEVEL: NonNullable<RawEnv['LOG_LEVEL']> }

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => {
      const variable = issue.path.join('.') || 'unknown variable'
      return `  - ${variable}: ${issue.message}`
    })
    .join('\n')

  throw new Error(
    `\n[env] Invalid environment configuration. ` +
      `Fix the following variable(s) in your .env file:\n${details}\n`,
  )
}

// Default de log por ambiente: mais verboso em dev, enxuto em produção.
const defaultLogLevel = parsed.data.NODE_ENV === 'production' ? 'info' : 'debug'

export const env: Env = {
  ...parsed.data,
  LOG_LEVEL: parsed.data.LOG_LEVEL ?? defaultLogLevel,
}
