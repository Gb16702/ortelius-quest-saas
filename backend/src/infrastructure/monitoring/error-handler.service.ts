import type { Context } from 'hono'
import { type ApiErrorResponse, createApiErrorResponse, ErrorCode } from '../types/api.types'

export class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public details?: Record<string, unknown>,
    public httpStatus = 500
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const createApiError = (
  _c: Context,
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ApiErrorResponse => createApiErrorResponse(code, message, details)

export const handleError = (c: Context, error: unknown): Response => {
  console.error('API Error:', {
    path: c.req.path,
    method: c.req.method,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    isAppError: error instanceof AppError,
    httpStatus: error instanceof AppError ? error.httpStatus : 'N/A',
  })

  if (error instanceof AppError) {
    return c.json(
      createApiError(c, error.code, error.message, error.details),
      error.httpStatus as 200 | 201 | 400 | 401 | 403 | 404 | 409 | 500
    )
  }

  if (error instanceof Error) {
    if (error.message.includes('not found')) {
      return c.json(createApiError(c, ErrorCode.NOT_FOUND, 'Resource not found'), 404)
    }

    if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
      return c.json(createApiError(c, ErrorCode.UNAUTHORIZED, 'Authentication required'), 401)
    }

    if (error.message.includes('forbidden') || error.message.includes('permission')) {
      return c.json(createApiError(c, ErrorCode.FORBIDDEN, 'Insufficient permissions'), 403)
    }
  }

  return c.json(
    createApiError(c, ErrorCode.INTERNAL_SERVER_ERROR, 'An internal server error occurred'),
    500
  )
}

export const throwNotFound = (
  message = 'Resource not found',
  details?: Record<string, unknown>
) => {
  throw new AppError(ErrorCode.NOT_FOUND, message, details, 404)
}

export const throwUnauthorized = (
  message = 'Authentication required',
  details?: Record<string, unknown>
) => {
  throw new AppError(ErrorCode.UNAUTHORIZED, message, details, 401)
}

export const throwForbidden = (
  message = 'Insufficient permissions',
  details?: Record<string, unknown>
) => {
  throw new AppError(ErrorCode.FORBIDDEN, message, details, 403)
}

export const throwValidationError = (
  message = 'Validation failed',
  details?: Record<string, unknown>
) => {
  throw new AppError(ErrorCode.VALIDATION_ERROR, message, details, 400)
}

export const throwConflict = (message = 'Resource conflict', details?: Record<string, unknown>) => {
  throw new AppError(ErrorCode.CONFLICT, message, details, 409)
}

export const throwBadRequest = (message = 'Bad request', details?: Record<string, unknown>) => {
  throw new AppError(ErrorCode.BAD_REQUEST, message, details, 400)
}
