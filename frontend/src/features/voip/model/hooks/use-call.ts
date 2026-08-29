import { useCallback, useEffect, useRef } from "react"
import { fetchIceServers, type IceServersConfig } from "@/shared/api/webrtc/ice-servers.config"
import { type WebRTCCallbacks, WebRTCService } from "@/shared/api/webrtc/web-rtc"
import { fetchWsTicket } from "@/shared/api/websocket/ws-ticket.client"
import { publicEnv } from "@/shared/config/env"
import { showErrorToast } from "@/shared/ui/toasts"
import { CALL_API } from "../../api/call.api"
import { CallSignalingClient } from "../../api/call-signaling.client"
import type { Call, CallParticipant, CallType, IncomingCallData } from "../call"
import { useCallStore } from "../use-call.store"

const CALL_TIMEOUT_MS = 30_000
const ICE_RESTART_DELAY_MS = 5_000
const ICE_RESTART_TIMEOUT_MS = 10_000
const ERROR_TOAST_DEDUPE_MS = 1_500

type CallParticipantInfo = {
    userId: string
    userName: string
    userImage?: string | null
}

type CallDisplayInfo = {
    displayName: string
    displayImage?: string | null
}

type UseCallOptions = {
    userId: string
    userName: string
    userImage?: string | null
}

type ReportedCallError = {
    message: string
    timestamp: number
}

function buildCallWsBaseUrl(): string {
    if (typeof window === "undefined") return ""
    const wsBase = publicEnv.API_URL.replace(/^http(s?):\/\//, (_match, secure) =>
        secure ? "wss://" : "ws://"
    )
    return `${wsBase.replace(/\/$/, "")}/api/call`
}

function notifyIceServersFallback(config: IceServersConfig): void {
    if (config.source !== "fallback") return

    showErrorToast(
        config.error
            ? `Call relay unavailable: ${config.error}`
            : "Call relay unavailable. This call may have trouble connecting on restricted networks."
    )
}

async function buildCallWsUrl(): Promise<string> {
    const url = buildCallWsBaseUrl()
    const ticket = await fetchWsTicket()
    return ticket ? `${url}?ticket=${encodeURIComponent(ticket)}` : url
}

function getCallErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof Error && error.message) return error.message
    return fallback
}

async function endCallAfterSetupFailure(callId: string): Promise<void> {
    try {
        await CALL_API.endCall(callId)
    } catch (error) {
        console.warn("Failed to end call after setup failure:", error)
    }
}

export function useCall(options: UseCallOptions) {
    const activeCall = useCallStore((s) => s.activeCall)
    const activeCallUI = useCallStore((s) => s.activeCallUI)
    const incomingCalls = useCallStore((s) => s.incomingCalls)
    const isInitiator = useCallStore((s) => s.isInitiator)

    const setActiveCall = useCallStore((s) => s.setActiveCall)
    const patchActiveCall = useCallStore((s) => s.patchActiveCall)
    const setIsInitiator = useCallStore((s) => s.setIsInitiator)
    const setLocalStream = useCallStore((s) => s.setLocalStream)
    const setRemoteStream = useCallStore((s) => s.setRemoteStream)
    const setConnectionState = useCallStore((s) => s.setConnectionState)
    const setIsMuted = useCallStore((s) => s.setIsMuted)
    const setIsRemoteMuted = useCallStore((s) => s.setIsRemoteMuted)
    const setIsMinimized = useCallStore((s) => s.setIsMinimized)
    const incrementCallDuration = useCallStore((s) => s.incrementCallDuration)
    const removeIncomingCall = useCallStore((s) => s.removeIncomingCall)
    const resetCallState = useCallStore((s) => s.resetCallState)

    const webrtcRef = useRef<WebRTCService | null>(null)
    const signalingRef = useRef<CallSignalingClient | null>(null)
    const callDurationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const iceRestartDelayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const iceRestartFailureTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const callingAudioRef = useRef<HTMLAudioElement | null>(null)
    const ringtoneAudioRef = useRef<HTMLAudioElement | null>(null)
    // Two independent flags. The offer is sent as soon as both are true,
    // regardless of which arrives first. This avoids a race between
    // `voip_call_response` (shared WS) and `participant:joined` (call WS).
    const callAcceptedRef = useRef<{ userId: string } | null>(null)
    const peerJoinedRef = useRef<{ userId: string } | null>(null)
    const offerSentRef = useRef(false)
    const isIceRestartingRef = useRef(false)
    const iceRecoveryGenerationRef = useRef(0)
    const lastReportedErrorRef = useRef<ReportedCallError | null>(null)

    const showCallError = useCallback((error: unknown, fallback: string) => {
        const message = getCallErrorMessage(error, fallback)
        const now = Date.now()
        const lastReported = lastReportedErrorRef.current

        if (
            lastReported?.message === message &&
            now - lastReported.timestamp < ERROR_TOAST_DEDUPE_MS
        ) {
            return
        }

        lastReportedErrorRef.current = { message, timestamp: now }
        showErrorToast(message)
    }, [])

    useEffect(() => {
        if (typeof window === "undefined") return
        callingAudioRef.current = new Audio("/sounds/ringtone.mp3")
        if (callingAudioRef.current) callingAudioRef.current.loop = true
        ringtoneAudioRef.current = new Audio("/sounds/ringtone.mp3")
        if (ringtoneAudioRef.current) ringtoneAudioRef.current.loop = true

        return () => {
            callingAudioRef.current?.pause()
            ringtoneAudioRef.current?.pause()
        }
    }, [])

    useEffect(() => {
        if (activeCall && isInitiator && !activeCallUI.remoteStream) {
            callingAudioRef.current?.play().catch(() => {})
        } else {
            callingAudioRef.current?.pause()
            if (callingAudioRef.current) callingAudioRef.current.currentTime = 0
        }
    }, [activeCall, isInitiator, activeCallUI.remoteStream])

    useEffect(() => {
        if (incomingCalls.length > 0) {
            ringtoneAudioRef.current?.play().catch(() => {})
        } else {
            ringtoneAudioRef.current?.pause()
            if (ringtoneAudioRef.current) ringtoneAudioRef.current.currentTime = 0
        }
    }, [incomingCalls.length])

    const clearIceRecovery = useCallback(() => {
        if (iceRestartDelayTimeoutRef.current) {
            clearTimeout(iceRestartDelayTimeoutRef.current)
            iceRestartDelayTimeoutRef.current = null
        }
        if (iceRestartFailureTimeoutRef.current) {
            clearTimeout(iceRestartFailureTimeoutRef.current)
            iceRestartFailureTimeoutRef.current = null
        }
        iceRecoveryGenerationRef.current += 1
        isIceRestartingRef.current = false
    }, [])

    const cleanupCall = useCallback(async () => {
        if (callDurationIntervalRef.current) {
            clearInterval(callDurationIntervalRef.current)
            callDurationIntervalRef.current = null
        }
        if (callTimeoutRef.current) {
            clearTimeout(callTimeoutRef.current)
            callTimeoutRef.current = null
        }
        clearIceRecovery()

        callAcceptedRef.current = null
        peerJoinedRef.current = null
        offerSentRef.current = false

        if (signalingRef.current) {
            signalingRef.current.disconnect()
            signalingRef.current = null
        }

        if (webrtcRef.current) {
            await webrtcRef.current.cleanup()
            webrtcRef.current = null
        }

        resetCallState()
    }, [clearIceRecovery, resetCallState])

    const restartIceWithTimeout = useCallback(async () => {
        const current = useCallStore.getState().activeCall
        const webrtc = webrtcRef.current
        if (!current || !webrtc || isIceRestartingRef.current) return

        const recoveryGeneration = iceRecoveryGenerationRef.current + 1
        iceRecoveryGenerationRef.current = recoveryGeneration
        isIceRestartingRef.current = true

        try {
            await webrtc.restartIce()

            const latestCall = useCallStore.getState().activeCall
            if (
                iceRecoveryGenerationRef.current !== recoveryGeneration ||
                latestCall?.id !== current.id ||
                webrtcRef.current !== webrtc
            ) {
                if (iceRecoveryGenerationRef.current === recoveryGeneration) {
                    isIceRestartingRef.current = false
                }
                return
            }

            if (webrtc.getConnectionState() === "connected") {
                isIceRestartingRef.current = false
                return
            }

            iceRestartFailureTimeoutRef.current = setTimeout(() => {
                const activeCallForTimeout = useCallStore.getState().activeCall
                if (
                    iceRecoveryGenerationRef.current !== recoveryGeneration ||
                    activeCallForTimeout?.id !== current.id ||
                    webrtcRef.current !== webrtc
                ) {
                    if (iceRecoveryGenerationRef.current === recoveryGeneration) {
                        iceRestartFailureTimeoutRef.current = null
                        isIceRestartingRef.current = false
                    }
                    return
                }

                iceRestartFailureTimeoutRef.current = null
                isIceRestartingRef.current = false
                showCallError(
                    new Error("Call connection could not recover. Please try again."),
                    "Call connection failed"
                )
                void cleanupCall()
            }, ICE_RESTART_TIMEOUT_MS)
        } catch (error) {
            const latestCall = useCallStore.getState().activeCall
            if (
                iceRecoveryGenerationRef.current !== recoveryGeneration ||
                latestCall?.id !== current.id ||
                webrtcRef.current !== webrtc
            ) {
                if (iceRecoveryGenerationRef.current === recoveryGeneration) {
                    isIceRestartingRef.current = false
                }
                return
            }

            isIceRestartingRef.current = false
            showCallError(error, "Call connection failed")
            await cleanupCall()
        }
    }, [cleanupCall, showCallError])

    const scheduleIceRestart = useCallback(
        (delayMs: number) => {
            const current = useCallStore.getState().activeCall
            if (
                !current ||
                !webrtcRef.current ||
                isIceRestartingRef.current ||
                iceRestartFailureTimeoutRef.current
            ) {
                return
            }

            if (iceRestartDelayTimeoutRef.current) {
                clearTimeout(iceRestartDelayTimeoutRef.current)
                iceRestartDelayTimeoutRef.current = null
            }

            iceRestartDelayTimeoutRef.current = setTimeout(() => {
                iceRestartDelayTimeoutRef.current = null
                void restartIceWithTimeout()
            }, delayMs)
        },
        [restartIceWithTimeout]
    )

    const sendOfferIfPossible = useCallback(async () => {
        if (offerSentRef.current) return
        const current = useCallStore.getState().activeCall
        if (!current || !useCallStore.getState().isInitiator || !webrtcRef.current) return
        try {
            offerSentRef.current = true
            const offer = await webrtcRef.current.createOffer(current.type)
            signalingRef.current?.sendOffer(offer)
        } catch (error) {
            offerSentRef.current = false
            showCallError(error, "Could not connect the call")
            await cleanupCall()
        }
    }, [cleanupCall, showCallError])

    const tryStartOffer = useCallback(async () => {
        if (!callAcceptedRef.current || !peerJoinedRef.current) return
        const accepted = callAcceptedRef.current.userId
        const joined = peerJoinedRef.current.userId
        // Wildcard ("*") matches any user that joined; otherwise must match.
        if (accepted !== "*" && joined !== "*" && accepted !== joined) return
        await sendOfferIfPossible()
    }, [sendOfferIfPossible])

    const handleRemoteOffer = useCallback(async (offer: RTCSessionDescriptionInit) => {
        const current = useCallStore.getState().activeCall
        if (!current || !webrtcRef.current) return
        const accepted = await webrtcRef.current.handleOffer(offer)
        if (!accepted) return
        const answer = await webrtcRef.current.createAnswer(current.type)
        if (answer) {
            signalingRef.current?.sendAnswer(answer)
        }
    }, [])

    const handleRemoteAnswer = useCallback(
        async (answer: RTCSessionDescriptionInit) => {
            if (!webrtcRef.current) return
            await webrtcRef.current.handleAnswer(answer)
            patchActiveCall({ status: "connected", callerName: "Connected" })
        },
        [patchActiveCall]
    )

    const handleRemoteIceCandidate = useCallback(async (candidate: RTCIceCandidateInit) => {
        if (!webrtcRef.current) return
        await webrtcRef.current.addIceCandidate(candidate)
    }, [])

    const handleRemoteMute = useCallback(
        (params: { callId: string; isMuted: boolean }) => {
            const current = useCallStore.getState().activeCall
            if (current?.id === params.callId) {
                setIsRemoteMuted(params.isMuted)
            }
        },
        [setIsRemoteMuted]
    )

    const handleCallAccepted = useCallback(
        async (acceptedBy?: { userId: string; userName?: string; userImage?: string | null }) => {
            const current = useCallStore.getState().activeCall
            if (!current || !useCallStore.getState().isInitiator || !webrtcRef.current) return
            if (callTimeoutRef.current) {
                clearTimeout(callTimeoutRef.current)
                callTimeoutRef.current = null
            }
            const patch: Partial<Call> = { status: "connecting", callerName: "Connecting..." }
            if (acceptedBy) {
                const remoteParticipant: CallParticipant = {
                    userId: acceptedBy.userId,
                    userName: acceptedBy.userName ?? current.remoteParticipant?.userName ?? "",
                    userImage: acceptedBy.userImage ?? current.remoteParticipant?.userImage ?? null,
                    isMuted: false,
                }
                patch.remoteParticipant = remoteParticipant
                patch.calleeName = remoteParticipant.userName
                patch.calleeImage = remoteParticipant.userImage
                patch.calleeUserId = acceptedBy.userId
            }
            patchActiveCall(patch)
            callAcceptedRef.current = { userId: acceptedBy?.userId ?? "*" }
            await tryStartOffer()
        },
        [patchActiveCall, tryStartOffer]
    )

    const initSignaling = useCallback(
        (callId: string) => {
            if (signalingRef.current) return signalingRef.current
            const signaling = new CallSignalingClient({
                url: buildCallWsBaseUrl(),
                getUrl: buildCallWsUrl,
                callId,
                userId: options.userId,
                userName: options.userName,
                onMessage: async (message) => {
                    switch (message.type) {
                        case "webrtc:offer":
                            await handleRemoteOffer({ type: "offer", sdp: message.sdp })
                            break
                        case "webrtc:answer":
                            await handleRemoteAnswer({ type: "answer", sdp: message.sdp })
                            break
                        case "webrtc:ice":
                            await handleRemoteIceCandidate({
                                candidate: message.candidate,
                                sdpMid: message.sdpMid ?? null,
                                sdpMLineIndex: message.sdpMLineIndex ?? null,
                            })
                            break
                        case "participant:mute":
                            if (message.userId && message.userId !== options.userId) {
                                handleRemoteMute({
                                    callId: message.callId,
                                    isMuted: message.isMuted,
                                })
                            }
                            break
                        case "participant:left": {
                            if (message.userId !== options.userId) {
                                const current = useCallStore.getState().activeCall
                                if (current?.id === message.callId) {
                                    await cleanupCall()
                                }
                            }
                            break
                        }
                        case "participant:joined": {
                            if (message.userId === options.userId) break
                            peerJoinedRef.current = { userId: message.userId }
                            await tryStartOffer()
                            break
                        }
                        case "call:ready":
                            // Server confirmed our join is registered; nothing else needed.
                            break
                        default:
                            break
                    }
                },
                onError: (error) => {
                    showErrorToast(error.message || "Call signaling failed")
                },
            })
            void signaling.connect()
            signalingRef.current = signaling
            return signaling
        },
        [
            options.userId,
            options.userName,
            handleRemoteOffer,
            handleRemoteAnswer,
            handleRemoteIceCandidate,
            handleRemoteMute,
            cleanupCall,
            tryStartOffer,
        ]
    )

    const initWebRTC = useCallback(
        async (iceServers: RTCIceServer[], callId: string) => {
            if (webrtcRef.current) return webrtcRef.current

            const callbacks: WebRTCCallbacks = {
                onLocalStream: (stream) => setLocalStream(stream),
                onRemoteStream: (stream) => {
                    setRemoteStream(stream)
                    if (!callDurationIntervalRef.current) {
                        callDurationIntervalRef.current = setInterval(() => {
                            incrementCallDuration()
                        }, 1000)
                    }
                },
                onIceCandidate: (candidate) => {
                    signalingRef.current?.sendIceCandidate(candidate.toJSON())
                },
                onConnectionStateChange: (state) => {
                    setConnectionState(state)
                    if (state === "disconnected") {
                        scheduleIceRestart(ICE_RESTART_DELAY_MS)
                    } else if (state === "connected") {
                        clearIceRecovery()
                    } else if (state === "failed") {
                        scheduleIceRestart(0)
                    } else if (state === "closed") {
                        clearIceRecovery()
                    }
                },
                onIceRestart: (offer) => {
                    signalingRef.current?.sendOffer(offer)
                },
                onError: (error) => showCallError(error, "Call connection failed"),
            }

            // Ensure signaling channel exists before WebRTC starts producing ICE candidates.
            initSignaling(callId)

            const webrtc = new WebRTCService({ iceServers }, callbacks)
            await webrtc.initialize()
            // Caller (initiator) is impolite; callee is polite. Resolves glare on ICE restart.
            webrtc.setPolite(!useCallStore.getState().isInitiator)
            webrtcRef.current = webrtc
            return webrtc
        },
        [
            setLocalStream,
            setRemoteStream,
            setConnectionState,
            incrementCallDuration,
            clearIceRecovery,
            initSignaling,
            scheduleIceRestart,
            showCallError,
        ]
    )

    const initiateOrgCall = useCallback(
        async (
            conversationId: string,
            orgInfo: { name: string; logo?: string | null },
            callerDisplayInfo: CallDisplayInfo,
            callType: CallType = "audio"
        ): Promise<Call> => {
            let createdCallId: string | null = null
            try {
                // Backend creates the row and returns the canonical UUID. If
                // it fails, abort — there is no recovery: a client-generated
                // UUID would not exist in voip_call, so every downstream
                // /api/call query ("Call not found") would hang the UI in a
                // ringing state with no peer ever able to join.
                const callRecord = await CALL_API.initiateCall({
                    conversationId,
                    calleeId: null,
                    callType,
                })
                const callId = callRecord.id
                createdCallId = callId
                const iceServersConfig = await fetchIceServers()

                const localParticipant: CallParticipant = {
                    userId: options.userId,
                    userName: options.userName,
                    userImage: options.userImage,
                    isMuted: false,
                }
                const remoteParticipant: CallParticipant = {
                    userId: "",
                    userName: orgInfo.name,
                    userImage: orgInfo.logo ?? null,
                    isMuted: false,
                }

                const call: Call = {
                    id: callId,
                    conversationId,
                    type: callType,
                    status: "initiating",
                    direction: "outgoing",
                    initiatorId: options.userId,
                    participants: [localParticipant, remoteParticipant],
                    localParticipant,
                    remoteParticipant,
                    createdAt: callRecord.startedAt || new Date().toISOString(),
                    callId,
                    callType,
                    callerName: `Calling ${orgInfo.name}...`,
                    callerDisplayName: callerDisplayInfo.displayName,
                    callerDisplayImage: callerDisplayInfo.displayImage,
                    calleeName: orgInfo.name,
                    calleeImage: orgInfo.logo ?? null,
                    calleeUserId: undefined,
                }

                setActiveCall(call)
                setIsInitiator(true)

                notifyIceServersFallback(iceServersConfig)
                await initWebRTC(iceServersConfig.iceServers, callId)
                if (!webrtcRef.current) throw new Error("Call connection was not initialized")
                await webrtcRef.current.getUserMedia(callType)
                signalingRef.current?.join()

                callTimeoutRef.current = setTimeout(() => {
                    cleanupCall()
                }, CALL_TIMEOUT_MS)

                return call
            } catch (error) {
                if (createdCallId) await endCallAfterSetupFailure(createdCallId)
                showCallError(error, "Could not start the call")
                await cleanupCall()
                throw error
            }
        },
        [options, setActiveCall, setIsInitiator, initWebRTC, cleanupCall, showCallError]
    )

    const initiateCall = useCallback(
        async (
            conversationId: string,
            calleeInfo: CallParticipantInfo,
            callerDisplayInfo: CallDisplayInfo,
            callType: CallType = "audio"
        ): Promise<Call> => {
            let createdCallId: string | null = null
            try {
                // See initiateOrgCall: a client-generated UUID would not
                // exist in voip_call, so the call would never reach a peer.
                const callRecord = await CALL_API.initiateCall({
                    conversationId,
                    calleeId: calleeInfo.userId,
                    callType,
                })
                const callId = callRecord.id
                createdCallId = callId
                const iceServersConfig = await fetchIceServers()

                const localParticipant: CallParticipant = {
                    userId: options.userId,
                    userName: options.userName,
                    userImage: options.userImage,
                    isMuted: false,
                }
                const remoteParticipant: CallParticipant = {
                    userId: calleeInfo.userId,
                    userName: calleeInfo.userName,
                    userImage: calleeInfo.userImage,
                    isMuted: false,
                }

                const call: Call = {
                    id: callId,
                    conversationId,
                    type: callType,
                    status: "initiating",
                    direction: "outgoing",
                    initiatorId: options.userId,
                    participants: [localParticipant, remoteParticipant],
                    localParticipant,
                    remoteParticipant,
                    createdAt: callRecord.startedAt || new Date().toISOString(),
                    callId,
                    callType,
                    callerName: "Calling...",
                    callerDisplayName: callerDisplayInfo.displayName,
                    callerDisplayImage: callerDisplayInfo.displayImage,
                    calleeName: calleeInfo.userName,
                    calleeImage: calleeInfo.userImage,
                    calleeUserId: calleeInfo.userId,
                }

                setActiveCall(call)
                setIsInitiator(true)

                notifyIceServersFallback(iceServersConfig)
                await initWebRTC(iceServersConfig.iceServers, callId)
                if (!webrtcRef.current) throw new Error("Call connection was not initialized")
                await webrtcRef.current.getUserMedia(callType)
                signalingRef.current?.join()

                callTimeoutRef.current = setTimeout(() => {
                    cleanupCall()
                }, CALL_TIMEOUT_MS)

                return call
            } catch (error) {
                if (createdCallId) await endCallAfterSetupFailure(createdCallId)
                showCallError(error, "Could not start the call")
                await cleanupCall()
                throw error
            }
        },
        [options, setActiveCall, setIsInitiator, initWebRTC, cleanupCall, showCallError]
    )

    const acceptCall = useCallback(
        async (incomingCall: IncomingCallData): Promise<Call> => {
            let didAcceptCall = false
            try {
                removeIncomingCall(incomingCall.callId)

                const localParticipant: CallParticipant = {
                    userId: options.userId,
                    userName: options.userName,
                    userImage: options.userImage,
                    isMuted: false,
                }
                const remoteParticipant: CallParticipant = {
                    userId: incomingCall.callerId,
                    userName: incomingCall.callerName,
                    userImage: incomingCall.callerImage,
                    isMuted: false,
                }

                const call: Call = {
                    id: incomingCall.callId,
                    conversationId: incomingCall.conversationId,
                    type: incomingCall.callType,
                    status: "connecting",
                    direction: "incoming",
                    initiatorId: incomingCall.callerId,
                    participants: [localParticipant, remoteParticipant],
                    localParticipant,
                    remoteParticipant,
                    createdAt: incomingCall.timestamp,
                    answeredAt: new Date().toISOString(),
                    callId: incomingCall.callId,
                    callType: incomingCall.callType,
                    callerName: incomingCall.callerName,
                    callerDisplayName: incomingCall.callerName,
                    callerDisplayImage: incomingCall.callerImage,
                    fromUserName: incomingCall.fromUserName,
                    fromUserImage: incomingCall.fromUserImage,
                }

                setActiveCall(call)
                setIsInitiator(false)

                const iceServersConfig = await fetchIceServers()

                // Server is the authority on whether this call can still be
                // accepted (already-ended / already-rejected / missed). If it
                // refuses, abort the WebRTC setup — otherwise the UI sticks
                // on "connecting" forever while the peer never sees us join.
                await CALL_API.acceptCall(incomingCall.callId)
                didAcceptCall = true

                notifyIceServersFallback(iceServersConfig)
                await initWebRTC(iceServersConfig.iceServers, incomingCall.callId)
                if (!webrtcRef.current) throw new Error("Call connection was not initialized")
                await webrtcRef.current.getUserMedia(incomingCall.callType)
                signalingRef.current?.join()

                return call
            } catch (error) {
                if (didAcceptCall) await endCallAfterSetupFailure(incomingCall.callId)
                showCallError(
                    error,
                    didAcceptCall ? "Could not join the call" : "This call is no longer available"
                )
                await cleanupCall()
                throw error
            }
        },
        [
            options,
            removeIncomingCall,
            setActiveCall,
            setIsInitiator,
            initWebRTC,
            cleanupCall,
            showCallError,
        ]
    )

    const declineCall = useCallback(
        async (callId: string) => {
            removeIncomingCall(callId)
            CALL_API.rejectCall(callId).catch(() => {})
        },
        [removeIncomingCall]
    )

    const endCall = useCallback(async () => {
        const current = useCallStore.getState().activeCall
        if (current) {
            CALL_API.endCall(current.id).catch(() => {})
        }
        await cleanupCall()
    }, [cleanupCall])

    const toggleMute = useCallback(() => {
        if (!webrtcRef.current) return
        const newMutedState = !useCallStore.getState().activeCallUI.isMuted
        webrtcRef.current.setMicrophoneMuted(newMutedState)
        setIsMuted(newMutedState)
        signalingRef.current?.sendMuteStatus(newMutedState)
    }, [setIsMuted])

    const minimizeCall = useCallback(() => setIsMinimized(true), [setIsMinimized])
    const maximizeCall = useCallback(() => setIsMinimized(false), [setIsMinimized])

    useEffect(() => {
        return () => {
            cleanupCall()
        }
    }, [cleanupCall])

    const getWebRtc = useCallback(() => webrtcRef.current, [])

    return {
        activeCall,
        activeCallUI,
        incomingCalls,
        isInitiator,
        isInCall: activeCall !== null,
        hasIncomingCalls: incomingCalls.length > 0,

        initiateCall,
        initiateOrgCall,
        acceptCall,
        declineCall,
        endCall,
        toggleMute,
        minimizeCall,
        maximizeCall,

        // Lifecycle handlers still wired by use-voip-ws-events for call_request/response/end.
        handleCallAccepted,
        cleanupCall,
        getWebRtc,
    }
}

export type UseCallReturn = ReturnType<typeof useCall>
