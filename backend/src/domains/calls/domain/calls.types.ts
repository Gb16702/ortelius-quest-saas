export type CallStatus = 'pending' | 'active' | 'ended' | 'rejected' | 'missed'
export type CallType = 'audio' | 'video'

export interface CallRecord {
  id: string
  conversationId: string
  callerId: string
  calleeId: string | null
  callType: CallType
  status: CallStatus
  startedAt: Date
  endedAt: Date | null
  duration: string | null
  endedBy: string | null
  recordingUrl: string | null
  transcriptId: string | null
  metadata: Record<string, unknown> | null
}

export interface InitiateCallInput {
  callerId: string
  calleeId?: string
  conversationId: string
  callType: CallType
}

export interface CallHistoryQuery {
  userId: string
  status?: CallStatus
  page: number
  limit: number
}

export interface CallHistoryResult {
  data: CallRecord[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export interface MetricsSample {
  timestamp: string
  metrics: {
    audio?: Record<string, unknown>
    video?: Record<string, unknown>
    connection?: Record<string, unknown>
  }
}

export interface VoipCallParticipant {
  id: string
  callId: string
  userId: string
  joinedAt?: Date | null
  leftAt?: Date | null
  status: 'invited' | 'joined' | 'declined'
  createdAt: Date
}

export interface VoipCallWithParticipants {
  id: string
  conversationId: string
  callerId: string
  callType: string
  startedAt: Date
  endedAt?: Date | null
  duration?: string | null
  status: string
  metadata?: Record<string, unknown>
  participants: VoipCallParticipant[]
}

export interface CallParticipantStatus {
  userId: string
  status: 'invited' | 'joined' | 'declined'
  joinedAt?: Date | null
  leftAt?: Date | null
}

export interface GroupCallInfo {
  callId: string
  conversationId: string
  totalParticipants: number
  joinedParticipants: number
  invitedParticipants: number
  declinedParticipants: number
  participants: CallParticipantStatus[]
}

export interface CallParticipant {
  userId: string
  userName: string
  joinedAt: Date
}

export interface ActiveCall {
  callId: string
  conversationId: string
  participants: Map<string, CallParticipant>
  startedAt: Date
  status: 'active' | 'ended'
}

export interface TranscriptSegment {
  id: number
  start: number
  end: number
  text: string
  speaker?: string
}

export interface TranscriptionResult {
  id: string
  text: string
  segments: TranscriptSegment[]
}

export interface TranscriptionOptions {
  model?: 'whisper-1'
  prompt?: string
  temperature?: number
}

export interface TranscriptionJob {
  id: string
  audioKey: string
  callId: string
  conversationId: string
  speakerInfo?: {
    userId: string
    userName: string
  }
  options?: {
    prompt?: string
  }
}

export interface EnhancedTranscriptSegment extends Omit<TranscriptSegment, 'speaker'> {
  speaker?:
    | string
    | {
        userId: string
        userName: string
        role: string
      }
}

export interface EnhancedTranscriptionResult extends Omit<TranscriptionResult, 'segments'> {
  segments: EnhancedTranscriptSegment[]
  audioKey: string
  createdAt: Date
  speakerInfo?: {
    userId: string
    userName: string
    role: string
  }
}

export interface CallSummaryData {
  callId: string
  conversationId: string
  participants: Array<{
    userId: string
    userName: string
    role: string
  }>
  transcripts: EnhancedTranscriptionResult[]
  startTime: Date
  endTime: Date
}

export interface CallSessionRepository {
  startCall(callId: string, conversationId: string, participants: CallParticipant[]): void
  addParticipant(callId: string, participant: CallParticipant): boolean
  removeParticipant(callId: string, userId: string): boolean
  endCall(callId: string): void
  getCall(callId: string): ActiveCall | undefined
  getParticipant(callId: string, userId: string): CallParticipant | undefined
  getParticipantByName(callId: string, userName: string): CallParticipant | undefined
  getAllParticipants(callId: string): CallParticipant[]
  isCallActive(callId: string): boolean
  getActiveCalls(): string[]
}

export interface TranscriptionRepository {
  transcribeAudioFile(
    audioKey: string,
    callId: string,
    conversationId: string,
    options?: TranscriptionOptions,
    speakerInfo?: { userId: string; userName: string }
  ): Promise<TranscriptionResult>
  getTranscript(transcriptId: string): Promise<TranscriptionResult>
  getTranscriptsByConversation(conversationId: string): Promise<TranscriptionResult[]>
  getTranscriptByCall(callId: string): Promise<TranscriptionResult | null>
  deleteTranscript(transcriptId: string): Promise<void>
}

export interface TranscriptionQueueRepository {
  addJob(job: TranscriptionJob): Promise<void>
  getJobStatus(jobId: string): Promise<{ status: string; result?: TranscriptionResult }>
  getQueueStats(): Promise<{ queueLength: number; processingCount: number; isProcessing: boolean }>
  retryFailedJob(jobId: string): Promise<void>
  startProcessor(): void
  stopProcessor(): Promise<void>
}

export interface CallSummaryRepository {
  generateCallSummary(callId: string, conversationId: string): Promise<string>
  getSummaryPDF(callId: string): Promise<{ buffer: Buffer; filename: string } | null>
}
