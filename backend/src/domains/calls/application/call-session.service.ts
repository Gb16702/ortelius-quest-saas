import type { ActiveCall, CallParticipant, CallSessionRepository } from '../domain/calls.types'

export class CallSessionService implements CallSessionRepository {
  private activeCalls = new Map<string, ActiveCall>()
  private static instance: CallSessionService

  static getInstance(): CallSessionService {
    if (!CallSessionService.instance) {
      CallSessionService.instance = new CallSessionService()
    }
    return CallSessionService.instance
  }

  startCall(callId: string, conversationId: string, participants: CallParticipant[]): void {
    const participantsMap = new Map(participants.map((p) => [p.userId, p]))

    this.activeCalls.set(callId, {
      callId,
      conversationId,
      participants: participantsMap,
      startedAt: new Date(),
      status: 'active',
    })
  }

  addParticipant(callId: string, participant: CallParticipant): boolean {
    const call = this.activeCalls.get(callId)
    if (!call) {
      console.warn(`Attempted to add participant to non-existent call: ${callId}`)
      return false
    }

    call.participants.set(participant.userId, participant)
    return true
  }

  removeParticipant(callId: string, userId: string): boolean {
    const call = this.activeCalls.get(callId)
    if (!call) {
      return false
    }

    return call.participants.delete(userId)
  }

  endCall(callId: string): { duration: number; participants: CallParticipant[] } | null {
    const call = this.activeCalls.get(callId)
    if (!call) {
      return null
    }

    const duration = Math.floor((Date.now() - call.startedAt.getTime()) / 1000)
    const participants = Array.from(call.participants.values())

    call.status = 'ended'

    setTimeout(() => {
      this.activeCalls.delete(callId)
    }, 30000)

    return { duration, participants }
  }

  getCall(callId: string): ActiveCall | undefined {
    return this.activeCalls.get(callId)
  }

  getParticipant(callId: string, userId: string): CallParticipant | undefined {
    const call = this.activeCalls.get(callId)
    return call?.participants.get(userId)
  }

  getParticipantByName(callId: string, userName: string): CallParticipant | undefined {
    const call = this.activeCalls.get(callId)
    if (!call) return undefined

    for (const [, participant] of call.participants) {
      if (participant.userName === userName) {
        return participant
      }
    }
    return undefined
  }

  getAllParticipants(callId: string): CallParticipant[] {
    const call = this.activeCalls.get(callId)
    return call ? Array.from(call.participants.values()) : []
  }

  isCallActive(callId: string): boolean {
    const call = this.activeCalls.get(callId)
    return call?.status === 'active' || false
  }

  getActiveCalls(): string[] {
    return Array.from(this.activeCalls.keys()).filter(
      (callId) => this.activeCalls.get(callId)?.status === 'active'
    )
  }
}
