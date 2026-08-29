import { EventEmitter } from 'node:events'
import type { CallRecord, CallType } from './calls.types'

export type CallEvent =
  | {
      type: 'call.initiated'
      callId: string
      callerId: string
      calleeId: string | null
      callType: CallType
      conversationId: string
    }
  | {
      type: 'call.accepted'
      callId: string
      acceptedBy: string
      callerId: string
      conversationId: string
      previousCalleeId: string | null
    }
  | {
      type: 'call.rejected'
      callId: string
      rejectedBy: string
      callerId: string
      conversationId: string
    }
  | {
      type: 'call.ended'
      callId: string
      endedBy: string
      duration: number | null
      call: CallRecord
    }
  | { type: 'call.missed'; callId: string; calleeId: string }
  | {
      type: 'call.recording_completed'
      callId: string
      recordingUrl: string
      conversationId: string
    }

class CallEventBus {
  private emitter = new EventEmitter()

  constructor() {
    this.emitter.setMaxListeners(50)
  }

  publish(event: CallEvent): void {
    this.emitter.emit(event.type, event)
    this.emitter.emit('*', event)
  }

  on<T extends CallEvent['type']>(
    type: T,
    handler: (event: Extract<CallEvent, { type: T }>) => void | Promise<void>
  ): () => void {
    const wrapped = (event: CallEvent) => {
      try {
        const result = handler(event as Extract<CallEvent, { type: T }>)
        if (result instanceof Promise) {
          result.catch((err) =>
            console.error(`[CallEvents] async handler for ${type} failed:`, err)
          )
        }
      } catch (err) {
        console.error(`[CallEvents] handler for ${type} failed:`, err)
      }
    }
    this.emitter.on(type, wrapped)
    return () => this.emitter.off(type, wrapped)
  }

  onAny(handler: (event: CallEvent) => void | Promise<void>): () => void {
    const wrapped = (event: CallEvent) => {
      try {
        const result = handler(event)
        if (result instanceof Promise) {
          result.catch((err) => console.error('[CallEvents] async wildcard handler failed:', err))
        }
      } catch (err) {
        console.error('[CallEvents] wildcard handler failed:', err)
      }
    }
    this.emitter.on('*', wrapped)
    return () => this.emitter.off('*', wrapped)
  }
}

export const callEvents = new CallEventBus()
