import { describe, expect, it } from 'bun:test'
import { initiateCallSchema, metricsBatchSchema } from '../presentation/calls.schemas'

const VALID_UUID = '33333333-3333-4333-8333-333333333333'

describe('initiateCallSchema', () => {
  it('accepts a 1-1 call with calleeId: <userId>', () => {
    const result = initiateCallSchema.safeParse({
      conversationId: VALID_UUID,
      calleeId: 'user-123',
      callType: 'audio',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an org call with calleeId: null', () => {
    // Regression: prod returned 400 here because the schema was
    // `z.string().min(1).optional()` which rejects explicit null.
    // The frontend then fell back to a non-UUID call ID, breaking
    // every downstream WS query.
    const result = initiateCallSchema.safeParse({
      conversationId: VALID_UUID,
      calleeId: null,
      callType: 'audio',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an org call with calleeId omitted', () => {
    const result = initiateCallSchema.safeParse({
      conversationId: VALID_UUID,
      callType: 'audio',
    })
    expect(result.success).toBe(true)
  })

  it('rejects a non-UUID conversationId', () => {
    const result = initiateCallSchema.safeParse({
      conversationId: 'not-a-uuid',
      calleeId: 'user-123',
      callType: 'audio',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown callType', () => {
    const result = initiateCallSchema.safeParse({
      conversationId: VALID_UUID,
      calleeId: 'user-123',
      callType: 'screenshare',
    })
    expect(result.success).toBe(false)
  })

  it('rejects an empty calleeId string', () => {
    const result = initiateCallSchema.safeParse({
      conversationId: VALID_UUID,
      calleeId: '',
      callType: 'audio',
    })
    expect(result.success).toBe(false)
  })
})

describe('metricsBatchSchema', () => {
  const validSample = {
    timestamp: '2026-05-05T20:00:00.000Z',
    metrics: { audio: { bytesReceived: 1000 } },
  }

  it('accepts a batch of 1 valid sample', () => {
    const result = metricsBatchSchema.safeParse({ samples: [validSample] })
    expect(result.success).toBe(true)
  })

  it('accepts video and connection metrics groups', () => {
    const result = metricsBatchSchema.safeParse({
      samples: [
        {
          timestamp: '2026-05-05T20:00:00.000Z',
          metrics: {
            audio: { bytesReceived: 1000 },
            video: { framesDecoded: 30 },
            connection: { rtt: 42 },
          },
        },
      ],
    })
    expect(result.success).toBe(true)
  })

  it('rejects an empty batch', () => {
    const result = metricsBatchSchema.safeParse({ samples: [] })
    expect(result.success).toBe(false)
  })

  it('rejects a batch larger than 500 samples (DoS guard)', () => {
    const result = metricsBatchSchema.safeParse({
      samples: Array.from({ length: 501 }, () => validSample),
    })
    expect(result.success).toBe(false)
  })

  it('rejects a sample missing timestamp', () => {
    const result = metricsBatchSchema.safeParse({
      samples: [{ metrics: { audio: {} } }],
    })
    expect(result.success).toBe(false)
  })
})
