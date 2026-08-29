import {
    VoIPCallCancelledMessageSchema,
    VoIPCallEndMessageSchema,
    VoIPCallRequestMessageSchema,
    VoIPCallResponseMessageSchema,
} from "@ortelius/websocket-types/messages"
import { useEffect } from "react"
import type { VoIPCallRequestMessage, WebSocketMessage } from "@/shared/api/websocket/web-socket"
import { useWebSocket } from "@/shared/api/websocket/web-socket.context"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { useCallStore } from "../use-call.store"
import type { UseCallReturn } from "./use-call"

type Options = {
    userId: string
    handleCallAccepted: UseCallReturn["handleCallAccepted"]
    cleanupCall: UseCallReturn["cleanupCall"]
}

function handleCallRequest(
    message: VoIPCallRequestMessage,
    userId: string,
    addIncomingCall: ReturnType<typeof useCallStore.getState>["addIncomingCall"]
) {
    const state = useCallStore.getState()
    if (message.fromUserId === userId) return
    if (state.activeCall || state.isInitiator) return
    if (!message.callId) return
    if (state.incomingCalls.some((c) => c.callId === message.callId)) return

    addIncomingCall({
        callId: message.callId,
        conversationId: message.conversationId,
        callType: message.callType,
        callerId: message.fromUserId || "",
        callerName: message.fromUserName || "Unknown",
        callerImage: message.fromUserImage ?? null,
        timestamp: message.timestamp,
        fromUserName: message.fromUserName,
        fromUserImage: message.fromUserImage,
        callerDisplayName: message.fromUserName,
        callerDisplayImage: message.fromUserImage,
        type: "call:request",
    })
}

async function handleCallResponse(message: WebSocketMessage, options: Options) {
    const parsed = safeParseSchema(VoIPCallResponseMessageSchema, message)
    if (!parsed.success) {
        console.error("Invalid call:response WebSocket payload:", parsed.error)
        return
    }

    const m = parsed.data
    if (!m.accepted) {
        await options.cleanupCall()
        return
    }

    await options.handleCallAccepted({
        userId: m.fromUserId ?? "",
        userName: m.fromUserName,
        userImage: m.fromUserImage,
    })
}

async function handleCallEnd(
    message: WebSocketMessage,
    cleanupCall: Options["cleanupCall"],
    removeIncomingCall: ReturnType<typeof useCallStore.getState>["removeIncomingCall"]
) {
    const parsed = safeParseSchema(VoIPCallEndMessageSchema, message)
    if (!parsed.success) {
        console.error("Invalid call:end WebSocket payload:", parsed.error)
        return
    }

    const m = parsed.data
    if (m.callId) removeIncomingCall(m.callId)
    await cleanupCall()
}

function handleCallCancelled(
    message: WebSocketMessage,
    removeIncomingCall: ReturnType<typeof useCallStore.getState>["removeIncomingCall"]
) {
    const parsed = safeParseSchema(VoIPCallCancelledMessageSchema, message)
    if (!parsed.success) {
        console.error("Invalid call:cancelled WebSocket payload:", parsed.error)
        return
    }

    removeIncomingCall(parsed.data.callId)
}

/**
 * Lifecycle-only listener on the shared realtime WebSocket.
 *
 * WebRTC signaling (offer/answer/ice/mute/participant:*) flows through the
 * dedicated /api/call WebSocket managed by CallSignalingClient — see use-call.ts.
 * This hook only handles call request/response/end notifications, which are
 * announcements rather than peer-to-peer signaling.
 */
export function useVoipWsEvents(options: Options) {
    const { subscribe } = useWebSocket()
    const addIncomingCall = useCallStore((s) => s.addIncomingCall)
    const removeIncomingCall = useCallStore((s) => s.removeIncomingCall)

    useEffect(() => {
        const handler = async (message: WebSocketMessage) => {
            switch (message.type) {
                case "call:request": {
                    const parsed = safeParseSchema(VoIPCallRequestMessageSchema, message)
                    if (!parsed.success) {
                        console.error("Invalid call:request WebSocket payload:", parsed.error)
                        return
                    }
                    handleCallRequest(parsed.data, options.userId, addIncomingCall)
                    return
                }
                case "call:response": {
                    await handleCallResponse(message, options)
                    return
                }
                case "call:end": {
                    await handleCallEnd(message, options.cleanupCall, removeIncomingCall)
                    return
                }
                case "call:cancelled": {
                    handleCallCancelled(message, removeIncomingCall)
                    return
                }
                default:
                    return
            }
        }
        return subscribe(handler)
    }, [subscribe, addIncomingCall, removeIncomingCall, options])
}
