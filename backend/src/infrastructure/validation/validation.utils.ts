import { zValidator } from '@hono/zod-validator'
import type { ZodType, z } from 'zod'
import { createApiErrorResponse, ErrorCode } from '../types/api.types'

const formatValidationIssues = (error: {
  issues: Array<{ path: PropertyKey[]; message: string; code: string }>
}) =>
  error.issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }))

export const validateJson = <T extends ZodType>(schema: T) => {
  return zValidator('json', schema, (result, c) => {
    if (result.success) return

    return c.json(
      createApiErrorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', {
        issues: formatValidationIssues(result.error),
      }),
      400
    )
  })
}

export const validateQuery = <T extends ZodType>(schema: T) => {
  return zValidator('query', schema, (result, c) => {
    if (result.success) return

    return c.json(
      createApiErrorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', {
        issues: formatValidationIssues(result.error),
      }),
      400
    )
  })
}

export const validateParam = <T extends ZodType>(schema: T) => {
  return zValidator('param', schema, (result, c) => {
    if (result.success) return

    return c.json(
      createApiErrorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', {
        issues: formatValidationIssues(result.error),
      }),
      400
    )
  })
}

export const validateHeader = <T extends ZodType>(schema: T) => {
  return zValidator('header', schema, (result, c) => {
    if (result.success) return

    return c.json(
      createApiErrorResponse(ErrorCode.VALIDATION_ERROR, 'Validation failed', {
        issues: formatValidationIssues(result.error),
      }),
      400
    )
  })
}

export type ValidatedData<T extends ZodType> = z.infer<T>
