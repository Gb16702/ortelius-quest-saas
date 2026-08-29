import type { Context, Next } from 'hono'
import { handleError } from './error-handler.service'

export const errorHandler = async (c: Context, next: Next) => {
  try {
    await next()
  } catch (error) {
    return handleError(c, error)
  }
}

export const asyncHandler = (fn: (c: Context, next: Next) => Promise<Response | undefined>) => {
  return async (c: Context, next: Next) => {
    try {
      const result = await fn(c, next)
      return result
    } catch (error) {
      return handleError(c, error)
    }
  }
}
