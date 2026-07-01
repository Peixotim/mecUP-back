import type { Request, RequestHandler } from 'express'
import type { ZodError, ZodType } from 'zod'

import { AppError, type ErrorDetail } from '@shared/errors/app-error'

export interface ValidationSchema {
  body?: ZodType
  query?: ZodType
  params?: ZodType
}

type ValidationTarget = keyof ValidationSchema

const TARGETS: readonly ValidationTarget[] = ['body', 'query', 'params']

function toDetails(error: ZodError, target: ValidationTarget): ErrorDetail[] {
  return error.issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : target,
    message: issue.message,
  }))
}

function applyCoerced(req: Request, target: ValidationTarget, value: unknown): void {
  Object.defineProperty(req, target, {
    value,
    writable: true,
    configurable: true,
    enumerable: true,
  })
}

/**
 * Middleware genérico de validação de entrada.
 *
 * Valida (e coage tipos de) body, query e/ou params contra os schemas Zod
 * informados. Em caso de falha, encaminha um AppError VALIDATION_ERROR (400)
 * com `details` apontando o campo e o motivo de cada violação, impedindo que
 * dados inválidos cheguem ao controller/service.
 */
export function validate(schema: ValidationSchema): RequestHandler {
  return (req, _res, next): void => {
    const details: ErrorDetail[] = []
    const coerced = new Map<ValidationTarget, unknown>()

    for (const target of TARGETS) {
      const partSchema = schema[target]
      if (!partSchema) {
        continue
      }

      const result = partSchema.safeParse(req[target])
      if (result.success) {
        coerced.set(target, result.data)
      } else {
        details.push(...toDetails(result.error, target))
      }
    }

    if (details.length > 0) {
      next(AppError.validationError('Invalid request payload', details))
      return
    }

    for (const [target, value] of coerced) {
      applyCoerced(req, target, value)
    }

    next()
  }
}

export default validate
