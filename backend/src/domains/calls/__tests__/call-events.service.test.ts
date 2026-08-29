import { describe, expect, it } from 'bun:test'
import { callEvents } from '../domain/call-events.service'

describe('callEvents bus', () => {
  it('dispatches typed events to matching handler', async () => {
    const received: string[] = []
    const off = callEvents.on('call.initiated', (e) => {
      received.push(e.callId)
    })

    callEvents.publish({
      type: 'call.initiated',
      callId: 'c1',
      callerId: 'u1',
      calleeId: 'u2',
      callType: 'audio',
      conversationId: 'conv1',
    })

    await new Promise((r) => setTimeout(r, 10))
    expect(received).toEqual(['c1'])
    off()
  })

  it('isolates handlers between event types', async () => {
    const accepted: string[] = []
    const off = callEvents.on('call.accepted', (e) => {
      accepted.push(e.callId)
    })

    callEvents.publish({ type: 'call.rejected', callId: 'c1', rejectedBy: 'u1' })
    await new Promise((r) => setTimeout(r, 10))
    expect(accepted).toEqual([])
    off()
  })

  it('handler errors do not crash the publisher', () => {
    const off = callEvents.on('call.ended', () => {
      throw new Error('boom')
    })
    expect(() => {
      callEvents.publish({
        type: 'call.ended',
        callId: 'c1',
        endedBy: 'u1',
        duration: 10,
        call: {
          id: 'c1',
          conversationId: 'conv1',
          callerId: 'u1',
          calleeId: 'u2',
          callType: 'audio',
          status: 'ended',
          startedAt: new Date(),
          endedAt: new Date(),
          duration: '10',
          endedBy: 'u1',
          recordingUrl: null,
          transcriptId: null,
          metadata: null,
        },
      })
    }).not.toThrow()
    off()
  })
})
