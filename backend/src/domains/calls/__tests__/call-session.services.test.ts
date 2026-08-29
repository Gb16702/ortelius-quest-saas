import { beforeEach, describe, expect, it } from 'bun:test'
import type { CallParticipant } from '../domain/calls.types'
import { CallSessionService } from '../infrastructure/calls.services'

describe('CallSessionService', () => {
  let callSessionService: CallSessionService

  beforeEach(() => {
    callSessionService = new CallSessionService()
  })

  const mockParticipants: CallParticipant[] = [
    { userId: 'user1', userName: 'John Doe', joinedAt: new Date() },
    { userId: 'user2', userName: 'Jane Smith', joinedAt: new Date() },
  ]

  describe('startCall', () => {
    it('should start a call with participants', () => {
      const callId = 'call-123'
      const conversationId = 'conv-456'

      callSessionService.startCall(callId, conversationId, mockParticipants)

      const call = callSessionService.getCall(callId)
      expect(call).toBeDefined()
      expect(call?.callId).toBe(callId)
      expect(call?.conversationId).toBe(conversationId)
      expect(call?.status).toBe('active')
      expect(call?.participants.size).toBe(2)
    })

    it('should handle empty participants list', () => {
      const callId = 'call-empty'
      const conversationId = 'conv-empty'

      callSessionService.startCall(callId, conversationId, [])

      const call = callSessionService.getCall(callId)
      expect(call).toBeDefined()
      expect(call?.participants.size).toBe(0)
    })
  })

  describe('addParticipant', () => {
    beforeEach(() => {
      callSessionService.startCall('call-123', 'conv-456', [mockParticipants[0]])
    })

    it('should add a participant to an existing call', () => {
      const newParticipant: CallParticipant = {
        userId: 'user3',
        userName: 'Bob Wilson',
        joinedAt: new Date(),
      }

      const success = callSessionService.addParticipant('call-123', newParticipant)

      expect(success).toBe(true)

      const call = callSessionService.getCall('call-123')
      expect(call?.participants.size).toBe(2)
      expect(call?.participants.get('user3')).toEqual(newParticipant)
    })

    it('should return false when adding participant to non-existent call', () => {
      const newParticipant: CallParticipant = {
        userId: 'user3',
        userName: 'Bob Wilson',
        joinedAt: new Date(),
      }

      const success = callSessionService.addParticipant('non-existent', newParticipant)

      expect(success).toBe(false)
    })

    it('should replace participant if user ID already exists', () => {
      const updatedParticipant: CallParticipant = {
        userId: 'user1',
        userName: 'John Updated',
        joinedAt: new Date(),
      }

      const success = callSessionService.addParticipant('call-123', updatedParticipant)

      expect(success).toBe(true)

      const call = callSessionService.getCall('call-123')
      expect(call?.participants.size).toBe(1)
      expect(call?.participants.get('user1')?.userName).toBe('John Updated')
    })
  })

  describe('removeParticipant', () => {
    beforeEach(() => {
      callSessionService.startCall('call-123', 'conv-456', mockParticipants)
    })

    it('should remove a participant from an existing call', () => {
      const success = callSessionService.removeParticipant('call-123', 'user1')

      expect(success).toBe(true)

      const call = callSessionService.getCall('call-123')
      expect(call?.participants.size).toBe(1)
      expect(call?.participants.has('user1')).toBe(false)
      expect(call?.participants.has('user2')).toBe(true)
    })

    it('should return false when removing participant from non-existent call', () => {
      const success = callSessionService.removeParticipant('non-existent', 'user1')

      expect(success).toBe(false)
    })

    it('should return false when removing non-existent participant', () => {
      const success = callSessionService.removeParticipant('call-123', 'non-existent-user')

      expect(success).toBe(false)
    })
  })

  describe('endCall', () => {
    beforeEach(() => {
      callSessionService.startCall('call-123', 'conv-456', mockParticipants)
    })

    it('should end an active call', () => {
      callSessionService.endCall('call-123')

      const call = callSessionService.getCall('call-123')
      expect(call?.status).toBe('ended')
    })

    it('should handle ending non-existent call gracefully', () => {
      expect(() => {
        callSessionService.endCall('non-existent')
      }).not.toThrow()
    })
  })

  describe('getParticipant', () => {
    beforeEach(() => {
      callSessionService.startCall('call-123', 'conv-456', mockParticipants)
    })

    it('should return participant by user ID', () => {
      const participant = callSessionService.getParticipant('call-123', 'user1')

      expect(participant).toBeDefined()
      expect(participant?.userId).toBe('user1')
      expect(participant?.userName).toBe('John Doe')
    })

    it('should return undefined for non-existent participant', () => {
      const participant = callSessionService.getParticipant('call-123', 'non-existent')

      expect(participant).toBeUndefined()
    })

    it('should return undefined for non-existent call', () => {
      const participant = callSessionService.getParticipant('non-existent', 'user1')

      expect(participant).toBeUndefined()
    })
  })

  describe('getParticipantByName', () => {
    beforeEach(() => {
      callSessionService.startCall('call-123', 'conv-456', mockParticipants)
    })

    it('should return participant by user name', () => {
      const participant = callSessionService.getParticipantByName('call-123', 'John Doe')

      expect(participant).toBeDefined()
      expect(participant?.userId).toBe('user1')
      expect(participant?.userName).toBe('John Doe')
    })

    it('should return undefined for non-existent participant name', () => {
      const participant = callSessionService.getParticipantByName('call-123', 'Non Existent')

      expect(participant).toBeUndefined()
    })

    it('should return undefined for non-existent call', () => {
      const participant = callSessionService.getParticipantByName('non-existent', 'John Doe')

      expect(participant).toBeUndefined()
    })
  })

  describe('getAllParticipants', () => {
    beforeEach(() => {
      callSessionService.startCall('call-123', 'conv-456', mockParticipants)
    })

    it('should return all participants for a call', () => {
      const participants = callSessionService.getAllParticipants('call-123')

      expect(participants).toHaveLength(2)
      expect(participants.map((p) => p.userId)).toEqual(['user1', 'user2'])
    })

    it('should return empty array for non-existent call', () => {
      const participants = callSessionService.getAllParticipants('non-existent')

      expect(participants).toEqual([])
    })

    it('should return empty array for call with no participants', () => {
      callSessionService.startCall('empty-call', 'conv-empty', [])

      const participants = callSessionService.getAllParticipants('empty-call')

      expect(participants).toEqual([])
    })
  })

  describe('isCallActive', () => {
    it('should return true for active call', () => {
      callSessionService.startCall('call-123', 'conv-456', mockParticipants)

      const isActive = callSessionService.isCallActive('call-123')

      expect(isActive).toBe(true)
    })

    it('should return false for ended call', () => {
      callSessionService.startCall('call-123', 'conv-456', mockParticipants)
      callSessionService.endCall('call-123')

      const isActive = callSessionService.isCallActive('call-123')

      expect(isActive).toBe(false)
    })

    it('should return false for non-existent call', () => {
      const isActive = callSessionService.isCallActive('non-existent')

      expect(isActive).toBe(false)
    })
  })

  describe('getActiveCalls', () => {
    it('should return list of active call IDs', () => {
      callSessionService.startCall('call-1', 'conv-1', [mockParticipants[0]])
      callSessionService.startCall('call-2', 'conv-2', [mockParticipants[1]])
      callSessionService.startCall('call-3', 'conv-3', mockParticipants)

      callSessionService.endCall('call-2')

      const activeCalls = callSessionService.getActiveCalls()

      expect(activeCalls).toHaveLength(2)
      expect(activeCalls).toContain('call-1')
      expect(activeCalls).toContain('call-3')
      expect(activeCalls).not.toContain('call-2')
    })

    it('should return empty array when no active calls', () => {
      const activeCalls = callSessionService.getActiveCalls()

      expect(activeCalls).toEqual([])
    })
  })

  describe('singleton behavior', () => {
    it('should return the same instance', () => {
      const instance1 = CallSessionService.getInstance()
      const instance2 = CallSessionService.getInstance()

      expect(instance1).toBe(instance2)
    })

    it('should maintain state across getInstance calls', () => {
      const instance1 = CallSessionService.getInstance()
      instance1.startCall('singleton-test', 'conv-test', mockParticipants)

      const instance2 = CallSessionService.getInstance()
      const call = instance2.getCall('singleton-test')

      expect(call).toBeDefined()
      expect(call?.participants.size).toBe(2)
    })
  })
})
