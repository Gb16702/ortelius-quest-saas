import type { CallEvent } from '../domain/call-events.service'
import type {
  CallHistoryQuery,
  CallHistoryResult,
  CallRecord,
  CallStatus,
  InitiateCallInput,
} from '../domain/calls.types'

export interface VoipCallRepository {
  create(input: InitiateCallInput): Promise<CallRecord>
  findById(callId: string): Promise<CallRecord | null>
  update(
    callId: string,
    patch: Partial<{
      status: CallStatus
      endedAt: Date
      duration: string
      endedBy: string
      recordingUrl: string
      transcriptId: string
      calleeId: string
    }>
  ): Promise<CallRecord | null>
  findActiveForUser(userId: string): Promise<CallRecord[]>
  findHistory(query: CallHistoryQuery): Promise<CallHistoryResult>
  isUserMemberOfConversationOrg(conversationId: string, userId: string): Promise<boolean>
}

export interface CallEventPublisher {
  publish(event: CallEvent): void
}

export class CallLifecycleError extends Error {
  constructor(
    message: string,
    public readonly code: 'NOT_FOUND' | 'FORBIDDEN' | 'INVALID_STATE' | 'INVALID_INPUT'
  ) {
    super(message)
    this.name = 'CallLifecycleError'
  }
}

function ensureParticipant(call: CallRecord, userId: string): void {
  if (call.callerId !== userId && call.calleeId !== userId) {
    throw new CallLifecycleError('You are not a participant of this call', 'FORBIDDEN')
  }
}

export function createCallLifecycleUseCases(deps: {
  repository: VoipCallRepository
  events: CallEventPublisher
}) {
  const { repository, events } = deps

  return {
    async initiate(input: InitiateCallInput): Promise<CallRecord> {
      if (input.calleeId && input.calleeId === input.callerId) {
        throw new CallLifecycleError('Cannot call yourself', 'INVALID_INPUT')
      }
      const call = await repository.create(input)
      events.publish({
        type: 'call.initiated',
        callId: call.id,
        callerId: call.callerId,
        calleeId: call.calleeId,
        callType: call.callType,
        conversationId: call.conversationId,
      })
      return call
    },

    async accept(callId: string, userId: string): Promise<CallRecord> {
      const call = await repository.findById(callId)
      if (!call) throw new CallLifecycleError('Call not found', 'NOT_FOUND')
      if (call.callerId === userId) {
        throw new CallLifecycleError('Cannot accept your own call', 'FORBIDDEN')
      }
      if (call.calleeId === null) {
        const isOrgMember = await repository.isUserMemberOfConversationOrg(
          call.conversationId,
          userId
        )
        if (!isOrgMember) {
          throw new CallLifecycleError('You are not a participant of this call', 'FORBIDDEN')
        }
      } else if (call.calleeId !== userId) {
        throw new CallLifecycleError('You are not a participant of this call', 'FORBIDDEN')
      }
      if (call.status !== 'pending') {
        throw new CallLifecycleError('Can only accept pending calls', 'INVALID_STATE')
      }
      const previousCalleeId = call.calleeId
      const updated = await repository.update(callId, {
        status: 'active',
        calleeId: call.calleeId ?? userId,
      })
      if (!updated) throw new CallLifecycleError('Call disappeared', 'NOT_FOUND')
      events.publish({
        type: 'call.accepted',
        callId,
        acceptedBy: userId,
        callerId: updated.callerId,
        conversationId: updated.conversationId,
        previousCalleeId,
      })
      return updated
    },

    async reject(callId: string, userId: string): Promise<CallRecord> {
      const call = await repository.findById(callId)
      if (!call) throw new CallLifecycleError('Call not found', 'NOT_FOUND')
      ensureParticipant(call, userId)
      if (call.status !== 'pending') {
        throw new CallLifecycleError('Can only reject pending calls', 'INVALID_STATE')
      }
      const updated = await repository.update(callId, {
        status: 'rejected',
        endedAt: new Date(),
        endedBy: userId,
      })
      if (!updated) throw new CallLifecycleError('Call disappeared', 'NOT_FOUND')
      events.publish({
        type: 'call.rejected',
        callId,
        rejectedBy: userId,
        callerId: updated.callerId,
        conversationId: updated.conversationId,
      })
      return updated
    },

    async end(callId: string, userId: string): Promise<CallRecord> {
      const call = await repository.findById(callId)
      if (!call) throw new CallLifecycleError('Call not found', 'NOT_FOUND')
      ensureParticipant(call, userId)
      if (call.status !== 'active') {
        throw new CallLifecycleError('Can only end active calls', 'INVALID_STATE')
      }
      const endedAt = new Date()
      const durationSec = Math.floor((endedAt.getTime() - call.startedAt.getTime()) / 1000)
      const updated = await repository.update(callId, {
        status: 'ended',
        endedAt,
        duration: String(durationSec),
        endedBy: userId,
      })
      if (!updated) throw new CallLifecycleError('Call disappeared', 'NOT_FOUND')
      events.publish({
        type: 'call.ended',
        callId,
        endedBy: userId,
        duration: durationSec,
        call: updated,
      })
      return updated
    },

    async markMissed(callId: string, userId: string): Promise<CallRecord> {
      const call = await repository.findById(callId)
      if (!call) throw new CallLifecycleError('Call not found', 'NOT_FOUND')
      ensureParticipant(call, userId)
      if (call.status !== 'pending') {
        throw new CallLifecycleError('Can only mark pending calls as missed', 'INVALID_STATE')
      }
      const updated = await repository.update(callId, {
        status: 'missed',
        endedAt: new Date(),
      })
      if (!updated) throw new CallLifecycleError('Call disappeared', 'NOT_FOUND')
      events.publish({ type: 'call.missed', callId, calleeId: call.calleeId ?? userId })
      return updated
    },

    async getById(callId: string, userId: string): Promise<CallRecord> {
      const call = await repository.findById(callId)
      if (!call) throw new CallLifecycleError('Call not found', 'NOT_FOUND')
      ensureParticipant(call, userId)
      return call
    },

    async getActive(userId: string): Promise<CallRecord[]> {
      return repository.findActiveForUser(userId)
    },

    async getHistory(query: CallHistoryQuery): Promise<CallHistoryResult> {
      return repository.findHistory(query)
    },
  }
}
