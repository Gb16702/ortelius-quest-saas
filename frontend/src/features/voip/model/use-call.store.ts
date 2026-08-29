import { create } from "zustand"
import { subscribeWithSelector } from "zustand/middleware"
import type { CallSignalingConnectionState } from "../api/call-signaling.client"
import type { Call, CallHistoryItem, CallStatus, IncomingCallData } from "./call"

function stopStreamTracks(stream: MediaStream | null) {
    if (stream) {
        for (const track of stream.getTracks()) {
            track.stop()
        }
    }
}

export type CallUIState = {
    isMinimized: boolean
    isMuted: boolean
    isRemoteMuted: boolean
    callDuration: number
    localStream: MediaStream | null
    remoteStream: MediaStream | null
    connectionState: RTCPeerConnectionState | null
}

export type CallStoreState = {
    incomingCalls: IncomingCallData[]
    activeCall: Call | null
    activeCallUI: CallUIState
    callHistory: CallHistoryItem[]
    signalingConnectionState: CallSignalingConnectionState
    isInitiator: boolean
}

export type CallStoreActions = {
    addIncomingCall: (call: IncomingCallData) => void
    removeIncomingCall: (callId: string) => void
    clearIncomingCalls: () => void

    setActiveCall: (call: Call | null) => void
    updateActiveCallStatus: (status: CallStatus) => void
    patchActiveCall: (patch: Partial<Call>) => void

    setIsMinimized: (isMinimized: boolean) => void
    setIsMuted: (isMuted: boolean) => void
    setIsRemoteMuted: (isRemoteMuted: boolean) => void
    setCallDuration: (duration: number) => void
    incrementCallDuration: () => void
    setLocalStream: (stream: MediaStream | null) => void
    setRemoteStream: (stream: MediaStream | null) => void
    setConnectionState: (state: RTCPeerConnectionState | null) => void
    setIsInitiator: (isInitiator: boolean) => void

    setCallHistory: (history: CallHistoryItem[]) => void
    addToCallHistory: (item: CallHistoryItem) => void

    setSignalingConnectionState: (state: CallSignalingConnectionState) => void

    resetCallState: () => void
    reset: () => void
}

const initialUIState: CallUIState = {
    isMinimized: false,
    isMuted: false,
    isRemoteMuted: false,
    callDuration: 0,
    localStream: null,
    remoteStream: null,
    connectionState: null,
}

const initialSignalingState: CallSignalingConnectionState = {
    connected: false,
    connecting: false,
    callId: null,
    error: null,
}

const initialState: CallStoreState = {
    incomingCalls: [],
    activeCall: null,
    activeCallUI: initialUIState,
    callHistory: [],
    signalingConnectionState: initialSignalingState,
    isInitiator: false,
}

export const useCallStore = create<CallStoreState & CallStoreActions>()(
    subscribeWithSelector((set, get) => ({
        ...initialState,

        addIncomingCall: (call) => {
            const { incomingCalls } = get()
            if (incomingCalls.some((c) => c.callId === call.callId)) return
            set({ incomingCalls: [...incomingCalls, call] })
        },

        removeIncomingCall: (callId) =>
            set((state) => ({
                incomingCalls: state.incomingCalls.filter((c) => c.callId !== callId),
            })),

        clearIncomingCalls: () => set({ incomingCalls: [] }),

        setActiveCall: (call) => set({ activeCall: call }),

        updateActiveCallStatus: (status) =>
            set((state) => ({
                activeCall: state.activeCall ? { ...state.activeCall, status } : null,
            })),

        patchActiveCall: (patch) =>
            set((state) => ({
                activeCall: state.activeCall ? { ...state.activeCall, ...patch } : null,
            })),

        setIsMinimized: (isMinimized) =>
            set((state) => ({ activeCallUI: { ...state.activeCallUI, isMinimized } })),

        setIsMuted: (isMuted) =>
            set((state) => ({ activeCallUI: { ...state.activeCallUI, isMuted } })),

        setIsRemoteMuted: (isRemoteMuted) =>
            set((state) => ({ activeCallUI: { ...state.activeCallUI, isRemoteMuted } })),

        setCallDuration: (callDuration) =>
            set((state) => ({ activeCallUI: { ...state.activeCallUI, callDuration } })),

        incrementCallDuration: () =>
            set((state) => ({
                activeCallUI: {
                    ...state.activeCallUI,
                    callDuration: state.activeCallUI.callDuration + 1,
                },
            })),

        setLocalStream: (localStream) =>
            set((state) => ({ activeCallUI: { ...state.activeCallUI, localStream } })),

        setRemoteStream: (remoteStream) =>
            set((state) => ({ activeCallUI: { ...state.activeCallUI, remoteStream } })),

        setConnectionState: (connectionState) =>
            set((state) => ({ activeCallUI: { ...state.activeCallUI, connectionState } })),

        setIsInitiator: (isInitiator) => set({ isInitiator }),

        setCallHistory: (callHistory) => set({ callHistory }),

        addToCallHistory: (item) => set((state) => ({ callHistory: [item, ...state.callHistory] })),

        setSignalingConnectionState: (signalingConnectionState) =>
            set({ signalingConnectionState }),

        resetCallState: () => {
            stopStreamTracks(get().activeCallUI.localStream)
            set({
                activeCall: null,
                activeCallUI: initialUIState,
                isInitiator: false,
                signalingConnectionState: initialSignalingState,
            })
        },

        reset: () => {
            stopStreamTracks(get().activeCallUI.localStream)
            set(initialState)
        },
    }))
)
