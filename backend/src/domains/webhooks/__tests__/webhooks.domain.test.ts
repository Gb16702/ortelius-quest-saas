import { describe, expect, it } from 'bun:test'
import {
  defaultInboundRequestDates,
  extractOrgSlugFromInboundEmail,
  requestNumberFromDate,
} from '../domain'

describe('Webhook domain policy', () => {
  it('extracts organization slugs from inbound addresses', () => {
    expect(extractOrgSlugFromInboundEmail('Acme@inbound.ortelius.app')).toBe('acme')
    expect(extractOrgSlugFromInboundEmail('support@example.com')).toBeNull()
  })

  it('builds deterministic request numbers and default date windows from the clock', () => {
    const now = new Date('2026-01-01T00:00:00.000Z')

    expect(requestNumberFromDate(now)).toBe(`REQ-${now.getTime()}`)
    expect(defaultInboundRequestDates(now)).toEqual({
      fromDate: now,
      toDate: new Date('2026-01-08T00:00:00.000Z'),
    })
  })
})
