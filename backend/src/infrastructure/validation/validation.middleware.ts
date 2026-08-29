import type { Context, Next } from 'hono'
import { z } from 'zod'
import { throwValidationError } from '../monitoring/error-handler.service'

export const validateBody = <T extends z.ZodSchema>(schema: T) => {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validatedData = schema.parse(body)
      c.set('validatedData', validatedData)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        throwValidationError('Validation failed', {
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        })
      }
      throw error
    }
  }
}

export const validateQuery = <T extends z.ZodSchema>(schema: T) => {
  return async (c: Context, next: Next) => {
    try {
      const query = c.req.query()
      const validatedQuery = schema.parse(query)
      c.set('validatedQuery', validatedQuery)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        throwValidationError('Query validation failed', {
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        })
      }
      throw error
    }
  }
}

export const validateParams = <T extends z.ZodSchema>(schema: T) => {
  return async (c: Context, next: Next) => {
    try {
      const params = c.req.param()
      const validatedParams = schema.parse(params)
      c.set('validatedParams', validatedParams)
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        throwValidationError('Parameter validation failed', {
          issues: error.issues.map((issue) => ({
            path: issue.path.join('.'),
            message: issue.message,
            code: issue.code,
          })),
        })
      }
      throw error
    }
  }
}
