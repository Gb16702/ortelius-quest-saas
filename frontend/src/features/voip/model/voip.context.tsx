import { createContext, use, useCallback, useMemo } from "react"
import type { Call, IncomingCallData } from "./call"
import { useCall } from "./hooks/use-call"
import { useCallMetrics } from "./hooks/use-call-metrics"
import { useVoipWsEvents } from "./hooks/use-voip-ws-events"

export interface VoIPCurrentUser {
    userId: string
    userName: string
    userImage?: string | null
}

export interface CallParticipantInfo {
    userId: string
    userName: string
    userImage?: string | null
}

export interface CallDisplayInfo {
    displayName: string
    displayImage?: string | null
}

interface VoIPContextValue {
    currentUser: VoIPCurrentUser
    incomingCalls: IncomingCallData[]
    activeCall: Call | null
    isInCall: boolean
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    isInitiator: boolean
    isMuted: boolean
    isRemoteMuted: boolean
    isMinimized: boolean
    callDuration: number
    connectionState: RTCPeerConnectionState | null
    hasIncomingCalls: boolean
    initiateCall: (
        conversationId: string,
        calleeInfo: CallParticipantInfo,
        callerDisplayInfo: CallDisplayInfo,
        callType?: "audio" | "video"
    ) => Promise<void>
    initiateOrgCall: (
        conversationId: string,
        orgInfo: { name: string; logo?: string | null },
        callerDisplayInfo: CallDisplayInfo,
        callType?: "audio" | "video"
    ) => Promise<void>
    acceptCall: (callId: string) => Promise<void>
    declineCall: (callId: string) => void
    endCall: () => void
    toggleMute: () => void
    minimizeCall: () => void
    maximizeCall: () => void
}

const VoIPContext = createContext<VoIPContextValue | null>(null)

interface VoIPProviderProps {
    children: React.ReactNode
    currentUser: VoIPCurrentUser
}

export function VoIPProvider({ children, currentUser }: VoIPProviderProps) {
    const { userId, userName, userImage } = currentUser

    const call = useCall({ userId, userName, userImage })

    useVoipWsEvents({
        userId,
        handleCallAccepted: call.handleCallAccepted,
        cleanupCall: call.cleanupCall,
    })

    useCallMetrics({ getWebRtc: call.getWebRtc })

    const initiateCall = useCallback(
        async (
            conversationId: string,
            calleeInfo: CallParticipantInfo,
            callerDisplayInfo: CallDisplayInfo,
            callType: "audio" | "video" = "audio"
        ) => {
            await call.initiateCall(conversationId, calleeInfo, callerDisplayInfo, callType)
        },
        [call]
    )

    const initiateOrgCall = useCallback(
        async (
            conversationId: string,
            orgInfo: { name: string; logo?: string | null },
            callerDisplayInfo: CallDisplayInfo,
            callType: "audio" | "video" = "audio"
        ) => {
            await call.initiateOrgCall(conversationId, orgInfo, callerDisplayInfo, callType)
        },
        [call]
    )

    const acceptCall = useCallback(
        async (callId: string) => {
            const incoming = call.incomingCalls.find((c) => c.callId === callId)
            if (!incoming) return
            await call.acceptCall(incoming)
        },
        [call]
    )

    const declineCall = useCallback(
        (callId: string) => {
            void call.declineCall(callId)
        },
        [call]
    )

    const endCall = useCallback(() => {
        void call.endCall()
    }, [call])

    const value = useMemo<VoIPContextValue>(
        () => ({
            currentUser,
            incomingCalls: call.incomingCalls,
            activeCall: call.activeCall,
            isInCall: call.isInCall,
            localStream: call.activeCallUI.localStream,
            remoteStream: call.activeCallUI.remoteStream,
            isInitiator: call.isInitiator,
            isMuted: call.activeCallUI.isMuted,
            isRemoteMuted: call.activeCallUI.isRemoteMuted,
            isMinimized: call.activeCallUI.isMinimized,
            callDuration: call.activeCallUI.callDuration,
            connectionState: call.activeCallUI.connectionState,
            hasIncomingCalls: call.hasIncomingCalls,
            initiateCall,
            initiateOrgCall,
            acceptCall,
            declineCall,
            endCall,
            toggleMute: call.toggleMute,
            minimizeCall: call.minimizeCall,
            maximizeCall: call.maximizeCall,
        }),
        [currentUser, call, initiateCall, initiateOrgCall, acceptCall, declineCall, endCall]
    )

    return <VoIPContext.Provider value={value}>{children}</VoIPContext.Provider>
}

export function useVoIPCalls(): VoIPContextValue {
    const context = use(VoIPContext)
    if (!context) {
        throw new Error("useVoIPCalls must be used within VoIPProvider")
    }
    return context
}
