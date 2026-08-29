import { createHash } from 'node:crypto'
import type { Context, Next } from 'hono'
import { organizationApplicationService } from '../../../organization/organization.application'
import { metricsApplicationService } from '../../metrics.application'

function getAnonymizedIdentifier(ipAddress: string): string {
  const salt = process.env.VIEW_TRACKING_SALT || 'default-salt-change-in-production'

  return createHash('sha256').update(`${ipAddress}:${salt}`).digest('hex')
}

export const trackNewVisitorMiddleware = async (c: Context, next: Next) => {
  await next()

  if (c.res.status === 200) {
    const { slug } = c.req.param()

    if (slug) {
      try {
        const org = await organizationApplicationService.getBySlug(slug)

        if (org) {
          let shouldTrack = true

          const user = c.get('user')
          if (user) {
            const role = await organizationApplicationService.getUserRole(org.id, user.id)
            shouldTrack = !role
          }

          if (shouldTrack) {
            let viewerIdentifier: string

            if (user?.id) {
              viewerIdentifier = `user:${user.id}`
            } else {
              const ipAddress =
                c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown'
              viewerIdentifier = `anonymous:${getAnonymizedIdentifier(ipAddress)}`
            }

            metricsApplicationService
              .incrementNewVisitorMetric(org.id, viewerIdentifier)
              .catch(console.error)
          }
        }
      } catch (error) {
        console.error('Error tracking new visitor:', error)
      }
    }
  }
}
