import { describe, expect, it } from 'bun:test'
import {
  calculateActivityScore,
  decodeActivityCursor,
  EVENT_TYPE_METADATA,
  encodeActivityCursor,
  getActivityScoreEventWeight,
  getActivityScoreTargetPoints,
} from '../domain'

describe('Activity domain', () => {
  it('encodes and decodes stable pagination cursors', () => {
    const createdAt = new Date('2026-05-01T12:00:00.000Z')

    const cursor = encodeActivityCursor(createdAt, 'activity-1')
    const decoded = decodeActivityCursor(cursor)

    expect(decoded).toEqual({ createdAt, id: 'activity-1' })
  })

  it('returns null for malformed cursors', () => {
    expect(decodeActivityCursor('not-valid-base64')).toBeNull()
  })

  it('exposes event type metadata as pure domain data', () => {
    expect(EVENT_TYPE_METADATA['request-created']).toEqual({
      label: 'Request created',
      description: 'A new request was created.',
    })
  })

  it('calculates weighted activity scores capped at 100', () => {
    expect(getActivityScoreEventWeight('quote-created')).toBe(12)
    expect(getActivityScoreEventWeight('unknown-event')).toBe(1)
    expect(getActivityScoreTargetPoints(30)).toBe(120)
    expect(calculateActivityScore(60, 30)).toBe(50)
    expect(calculateActivityScore(240, 30)).toBe(100)
  })
})
