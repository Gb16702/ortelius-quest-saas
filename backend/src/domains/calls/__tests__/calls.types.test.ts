import { describe, expect, it } from 'bun:test'
import type {
  ActiveCall,
  CallParticipant,
  CallSummaryData,
  GroupCallInfo,
  TranscriptionResult,
  TranscriptSegment,
  VoipCallParticipant,
} from '../domain/calls.types'

describe('Calls Domain Types', () => {
  describe('CallParticipant', () => {
    it('should have required properties', () => {
      const participant: CallParticipant = {
        userId: 'user-123',
        userName: 'John Doe',
        joinedAt: new Date(),
      }

      expect(participant.userId).toBe('user-123')
      expect(participant.userName).toBe('John Doe')
      expect(participant.joinedAt).toBeInstanceOf(Date)
    })
  })

  describe('ActiveCall', () => {
    it('should represent an active call correctly', () => {
      const participants = new Map([
        ['user1', { userId: 'user1', userName: 'John', joinedAt: new Date() }],
        ['user2', { userId: 'user2', userName: 'Jane', joinedAt: new Date() }],
      ])

      const activeCall: ActiveCall = {
        callId: 'call-123',
        conversationId: 'conv-456',
        participants,
        startedAt: new Date(),
        status: 'active',
      }

      expect(activeCall.callId).toBe('call-123')
      expect(activeCall.conversationId).toBe('conv-456')
      expect(activeCall.participants.size).toBe(2)
      expect(activeCall.status).toBe('active')
    })
  })

  describe('TranscriptSegment', () => {
    it('should represent a transcript segment', () => {
      const segment: TranscriptSegment = {
        id: 1,
        start: 0,
        end: 5.5,
        text: 'Hello, this is a test',
        speaker: 'user-123',
      }

      expect(segment.id).toBe(1)
      expect(segment.start).toBe(0)
      expect(segment.end).toBe(5.5)
      expect(segment.text).toBe('Hello, this is a test')
      expect(segment.speaker).toBe('user-123')
    })

    it('should allow optional speaker', () => {
      const segment: TranscriptSegment = {
        id: 1,
        start: 0,
        end: 5.5,
        text: 'Anonymous speech',
      }

      expect(segment.speaker).toBeUndefined()
    })
  })

  describe('TranscriptionResult', () => {
    it('should represent transcription results', () => {
      const segments: TranscriptSegment[] = [
        {
          id: 1,
          start: 0,
          end: 5,
          text: 'First segment',
          speaker: 'user1',
        },
        {
          id: 2,
          start: 5,
          end: 10,
          text: 'Second segment',
          speaker: 'user2',
        },
      ]

      const result: TranscriptionResult = {
        id: 'transcript-123',
        text: 'First segment Second segment',
        segments,
      }

      expect(result.id).toBe('transcript-123')
      expect(result.text).toBe('First segment Second segment')
      expect(result.segments).toHaveLength(2)
    })
  })

  describe('CallSummaryData', () => {
    it('should represent call summary data structure', () => {
      const participants = [
        { userId: 'user1', userName: 'John Doe', role: 'participant' },
        { userId: 'user2', userName: 'Jane Smith', role: 'moderator' },
      ]

      const transcripts = [
        {
          id: 'transcript-1',
          text: 'Test transcript',
          segments: [],
          audioKey: 'audio-1',
          createdAt: new Date(),
        },
      ]

      const callSummary: CallSummaryData = {
        callId: 'call-123',
        conversationId: 'conv-456',
        participants,
        transcripts,
        startTime: new Date('2024-01-01T10:00:00Z'),
        endTime: new Date('2024-01-01T11:00:00Z'),
      }

      expect(callSummary.callId).toBe('call-123')
      expect(callSummary.conversationId).toBe('conv-456')
      expect(callSummary.participants).toHaveLength(2)
      expect(callSummary.transcripts).toHaveLength(1)
      expect(callSummary.startTime).toBeInstanceOf(Date)
      expect(callSummary.endTime).toBeInstanceOf(Date)
    })
  })

  describe('VoipCallParticipant', () => {
    it('should represent VoIP call participant', () => {
      const participant: VoipCallParticipant = {
        id: 'participant-123',
        callId: 'call-456',
        userId: 'user-789',
        joinedAt: new Date(),
        leftAt: null,
        status: 'joined',
        createdAt: new Date(),
      }

      expect(participant.id).toBe('participant-123')
      expect(participant.callId).toBe('call-456')
      expect(participant.userId).toBe('user-789')
      expect(participant.status).toBe('joined')
      expect(participant.leftAt).toBeNull()
    })

    it('should support different statuses', () => {
      const invitedParticipant: VoipCallParticipant = {
        id: 'p1',
        callId: 'call1',
        userId: 'user1',
        status: 'invited',
        createdAt: new Date(),
      }

      const declinedParticipant: VoipCallParticipant = {
        id: 'p2',
        callId: 'call1',
        userId: 'user2',
        status: 'declined',
        createdAt: new Date(),
      }

      expect(invitedParticipant.status).toBe('invited')
      expect(declinedParticipant.status).toBe('declined')
    })
  })

  describe('GroupCallInfo', () => {
    it('should represent group call information', () => {
      const participants = [
        { userId: 'user1', status: 'joined' as const, joinedAt: new Date() },
        { userId: 'user2', status: 'invited' as const },
        { userId: 'user3', status: 'declined' as const },
      ]

      const groupCallInfo: GroupCallInfo = {
        callId: 'call-123',
        conversationId: 'conv-456',
        totalParticipants: 3,
        joinedParticipants: 1,
        invitedParticipants: 1,
        declinedParticipants: 1,
        participants,
      }

      expect(groupCallInfo.callId).toBe('call-123')
      expect(groupCallInfo.conversationId).toBe('conv-456')
      expect(groupCallInfo.totalParticipants).toBe(3)
      expect(groupCallInfo.joinedParticipants).toBe(1)
      expect(groupCallInfo.invitedParticipants).toBe(1)
      expect(groupCallInfo.declinedParticipants).toBe(1)
      expect(groupCallInfo.participants).toHaveLength(3)
    })
  })

  describe('Type compatibility', () => {
    it('should ensure ActiveCall participants work with CallParticipant', () => {
      const participant: CallParticipant = {
        userId: 'user1',
        userName: 'John',
        joinedAt: new Date(),
      }

      const participants = new Map([['user1', participant]])

      const activeCall: ActiveCall = {
        callId: 'call-1',
        conversationId: 'conv-1',
        participants,
        startedAt: new Date(),
        status: 'active',
      }

      const retrievedParticipant = activeCall.participants.get('user1')
      expect(retrievedParticipant).toEqual(participant)
    })

    it('should handle complex speaker objects in segments', () => {
      const segment: TranscriptSegment = {
        id: 1,
        start: 0,
        end: 5,
        text: 'Complex speaker test',
        speaker: 'simple-string-speaker',
      }

      expect(segment.speaker).toBe('simple-string-speaker')
    })
  })
})
