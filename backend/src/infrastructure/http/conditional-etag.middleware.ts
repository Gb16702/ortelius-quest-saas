import type { Context, MiddlewareHandler, Next } from 'hono'
import { etag } from 'hono/etag'

const etagMiddleware = etag()

export function shouldSkipEtag(_path: string): boolean {
  return false
}

export const conditionalEtagMiddleware: MiddlewareHandler = async (c: Context, next: Next) => {
  if (shouldSkipEtag(c.req.path)) {
    await next()
    return
  }

  await etagMiddleware(c, next)
}
