export type CallType = "audio" | "video"

export type CallStatus =
    | "idle"
    | "initiating"
    | "ringing"
    | "connecting"
    | "accepted"
    | "connected"
    | "ended"
    | "failed"
    | "rejected"
    | "missed"
    | "busy"

export type CallDirection = "incoming" | "outgoing"

export type CallEndReason =
    | "completed"
    | "rejected"
    | "missed"
    | "failed"
    | "busy"
    | "timeout"
    | "cancelled"

export type CallParticipant = {
    userId: string
    userName: string
    userImage?: string | null
    isMuted: boolean
    joinedAt?: string
}

export type CallMetricsSnapshot = {
    timestamp: string
    metrics: {
        audio?: Record<string, unknown>
        video?: Record<string, unknown>
        connection?: Record<string, unknown>
    }
}

export type Call = {
    id: string
    conversationId: string
    type: CallType
    status: CallStatus
    direction: CallDirection
    initiatorId: string
    participants: CallParticipant[]
    localParticipant: CallParticipant
    remoteParticipant: CallParticipant
    createdAt: string
    answeredAt?: string
    endedAt?: string
    endReason?: CallEndReason
    // Compatibility fields kept for components that read the old IncomingCall shape.
    callId?: string
    callType?: CallType
    callerName?: string
    callerDisplayName?: string
    callerDisplayImage?: string | null
    fromUserName?: string
    fromUserImage?: string | null
    calleeName?: string
    calleeImage?: string | null
    calleeUserId?: string
}

export type IncomingCallData = {
    callId: string
    conversationId: string
    callType: CallType
    callerId: string
    callerName: string
    callerImage?: string | null
    timestamp: string
    // Compatibility fields used by components that already display incoming calls.
    fromUserName?: string
    fromUserImage?: string | null
    callerDisplayName?: string
    callerDisplayImage?: string | null
    type?: "call:request"
}

export type CallHistoryItem = {
    id: string
    conversationId: string
    callerId: string
    calleeId: string | null
    callType: CallType
    status: "pending" | "active" | "ended" | "rejected" | "missed"
    startedAt: string
    endedAt: string | null
    duration: string | null
    endedBy: string | null
    recordingUrl: string | null
    transcriptId: string | null
    metadata: Record<string, unknown> | null
}

export type CallHistoryQuery = {
    page?: number
    limit?: number
    status?: "pending" | "active" | "ended" | "rejected" | "missed"
}

export type CallHistoryResponse = {
    data: CallHistoryItem[]
    pagination: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}

export type CallTranscript = {
    callId: string
    text: string
    pdfUrl?: string | null
    recordingUrl?: string | null
    segments?: Array<{
        speakerId?: string
        speakerName?: string
        text: string
        startTime?: number
        endTime?: number
    }>
}
