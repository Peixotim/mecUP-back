export interface ErrorDetail {
  field: string
  message: string
}

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly timestamp: string
  public readonly details?: ErrorDetail[]

  constructor(message: string, statusCode = 400, code = 'BAD_REQUEST', details?: ErrorDetail[]) {
    super(message)
    this.statusCode = statusCode
    this.code = code
    this.timestamp = new Date().toISOString()
    this.details = details
    this.name = 'AppError'
    Error.captureStackTrace(this, this.constructor)
  }

  static badRequest(message = 'Bad request'): AppError {
    return new AppError(message, 400, 'BAD_REQUEST')
  }

  static validationError(message = 'Validation error', details?: ErrorDetail[]): AppError {
    return new AppError(message, 400, 'VALIDATION_ERROR', details)
  }

  static unauthorized(message = 'Unauthorized'): AppError {
    return new AppError(message, 401, 'UNAUTHORIZED')
  }

  static invalidToken(message = 'Invalid or expired token'): AppError {
    return new AppError(message, 401, 'INVALID_TOKEN')
  }

  static invalidCredentials(message = 'Invalid credentials'): AppError {
    return new AppError(message, 401, 'INVALID_CREDENTIALS')
  }

  static forbidden(message = 'Access denied'): AppError {
    return new AppError(message, 403, 'FORBIDDEN')
  }

  static insufficientRole(message = 'Insufficient role to perform this action'): AppError {
    return new AppError(message, 403, 'INSUFFICIENT_ROLE')
  }

  static notFound(message = 'Resource not found'): AppError {
    return new AppError(message, 404, 'NOT_FOUND')
  }

  static userNotFound(message = 'User not found'): AppError {
    return new AppError(message, 404, 'USER_NOT_FOUND')
  }

  static conflict(message = 'Data conflict'): AppError {
    return new AppError(message, 409, 'CONFLICT')
  }

  static unprocessable(message = 'Unable to process request'): AppError {
    return new AppError(message, 422, 'UNPROCESSABLE_ENTITY')
  }

  static internal(message = 'Internal server error'): AppError {
    return new AppError(message, 500, 'INTERNAL_SERVER_ERROR')
  }

  static databaseError(message = 'Database communication error'): AppError {
    return new AppError(message, 500, 'DATABASE_ERROR')
  }

  toJSON(): object {
    return {
      status: 'error',
      code: this.code,
      message: this.message,
      ...(this.details ? { details: this.details } : {}),
      timestamp: this.timestamp,
    }
  }
}
