import { publicEnv } from "@/shared/config/env"

export interface WebRTCConfig {
    iceServers: RTCIceServer[]
}

export interface WebRTCStats {
    connectionState: RTCPeerConnectionState | null
    iceConnectionState: RTCIceConnectionState | null
    signalingState: RTCSignalingState | null
    roundTripTime?: number
    jitter?: number
    packetsLost?: number
    packetsReceived?: number
    bytesReceived?: number
    bytesSent?: number
    audioLevel?: number
    timestamp: number
}

export interface WebRTCCallbacks {
    onLocalStream?: (stream: MediaStream) => void
    onRemoteStream?: (stream: MediaStream) => void
    onIceCandidate?: (candidate: RTCIceCandidate) => void
    onConnectionStateChange?: (state: RTCPeerConnectionState) => void
    onIceGatheringStateChange?: (state: RTCIceGatheringState) => void
    onIceRestart?: (offer: RTCSessionDescriptionInit) => void
    onDeviceChange?: (devices: MediaDeviceInfo[]) => void
    onError?: (error: Error) => void
}

export class WebRTCService {
    private peerConnection: RTCPeerConnection | null = null
    private localStream: MediaStream | null = null
    private callbacks: WebRTCCallbacks = {}
    private pendingCandidates: RTCIceCandidateInit[] = []
    private deviceChangeHandler: (() => void) | null = null
    private polite = false
    private makingOffer = false
    private isSettingRemoteAnswerPending = false
    private ignoreOffer = false

    constructor(
        private config: WebRTCConfig,
        callbacks: WebRTCCallbacks = {}
    ) {
        this.callbacks = callbacks
    }

    setPolite(polite: boolean): void {
        this.polite = polite
    }

    async initialize(): Promise<void> {
        if (this.peerConnection) {
            throw new Error("WebRTC already initialized")
        }

        const rtcConfig: RTCConfiguration = {
            iceServers: this.config.iceServers,
            iceCandidatePoolSize: 10,
        }

        this.peerConnection = new RTCPeerConnection(rtcConfig)
        this.setupListeners()
        this.setupDeviceChangeListener()

        // Expose the active peer connection on `window` for E2E tests so they
        // can read RTCStats. Gated behind a build-time flag in production.
        if (typeof window !== "undefined" && (import.meta.env.DEV || publicEnv.E2E_EXPOSE_PC)) {
            ;(
                window as unknown as { __ORTELIUS_PEER_CONNECTION__: RTCPeerConnection }
            ).__ORTELIUS_PEER_CONNECTION__ = this.peerConnection
        }
    }

    private setupListeners(): void {
        if (!this.peerConnection) return

        this.peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                this.callbacks.onIceCandidate?.(event.candidate)
            }
        }

        this.peerConnection.ontrack = (event) => {
            if (event.streams?.[0]) {
                this.callbacks.onRemoteStream?.(event.streams[0])
            }
        }

        this.peerConnection.onconnectionstatechange = () => {
            const state = this.peerConnection?.connectionState
            if (state) {
                this.callbacks.onConnectionStateChange?.(state)
            }
        }

        this.peerConnection.onicegatheringstatechange = () => {
            const state = this.peerConnection?.iceGatheringState
            if (state) {
                this.callbacks.onIceGatheringStateChange?.(state)
            }
        }
    }

    async getUserMedia(callType: "audio" | "video" = "audio"): Promise<MediaStream> {
        if (this.localStream) return this.localStream

        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
                video: callType === "video",
            })
            this.callbacks.onLocalStream?.(this.localStream)
            return this.localStream
        } catch (error) {
            const err = error as DOMException
            let message = "Failed to access microphone"

            if (err.name === "NotAllowedError") {
                message = "Microphone access denied. Please enable in browser settings."
            } else if (err.name === "NotFoundError") {
                message = "No microphone found."
            } else if (err.name === "NotReadableError") {
                message = "Microphone is already in use."
            }

            const wrappedError = new Error(message)
            this.callbacks.onError?.(wrappedError)
            throw wrappedError
        }
    }

    async createOffer(callType: "audio" | "video" = "audio"): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error("WebRTC not initialized")
        }

        if (!this.localStream) {
            await this.getUserMedia(callType)
        }

        this.attachLocalTracks()

        try {
            this.makingOffer = true
            const offer = await this.peerConnection.createOffer({
                offerToReceiveAudio: true,
                offerToReceiveVideo: callType === "video",
            })

            await this.peerConnection.setLocalDescription(offer)
            return offer
        } finally {
            this.makingOffer = false
        }
    }

    /**
     * Attach local tracks to the peer connection, skipping any track that is
     * already attached to a sender. Idempotent — safe to call before each
     * (re)negotiation.
     */
    private attachLocalTracks(): void {
        if (!this.peerConnection || !this.localStream) return
        const attachedTrackIds = new Set(
            this.peerConnection
                .getSenders()
                .map((s) => s.track?.id)
                .filter((id): id is string => Boolean(id))
        )
        for (const track of this.localStream.getTracks()) {
            if (attachedTrackIds.has(track.id)) continue
            this.peerConnection.addTrack(track, this.localStream)
        }
    }

    async createAnswer(callType: "audio" | "video" = "audio"): Promise<RTCSessionDescriptionInit> {
        if (!this.peerConnection) {
            throw new Error("WebRTC not initialized")
        }

        if (!this.localStream) {
            await this.getUserMedia(callType)
        }

        this.attachLocalTracks()

        const answer = await this.peerConnection.createAnswer()
        await this.peerConnection.setLocalDescription(answer)
        return answer
    }

    /** Returns true if the offer was applied; false if ignored due to glare. */
    async handleOffer(offer: RTCSessionDescriptionInit): Promise<boolean> {
        if (!this.peerConnection) {
            throw new Error("WebRTC not initialized")
        }
        const readyForOffer =
            !this.makingOffer &&
            (this.peerConnection.signalingState === "stable" || this.isSettingRemoteAnswerPending)
        const offerCollision = !readyForOffer
        this.ignoreOffer = !this.polite && offerCollision
        if (this.ignoreOffer) {
            return false
        }
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
        await this.flushPendingCandidates()
        return true
    }

    async handleAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error("WebRTC not initialized")
        }
        try {
            this.isSettingRemoteAnswerPending = true
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
        } finally {
            this.isSettingRemoteAnswerPending = false
        }
        await this.flushPendingCandidates()
    }

    // Compatibility aliases used by the VoIP context.
    async processOffer(offer: RTCSessionDescriptionInit): Promise<void> {
        await this.handleOffer(offer)
    }
    processAnswer(answer: RTCSessionDescriptionInit): Promise<void> {
        return this.handleAnswer(answer)
    }

    async addIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
        if (!this.peerConnection) {
            throw new Error("WebRTC not initialized")
        }

        if (!this.peerConnection.remoteDescription) {
            this.pendingCandidates.push(candidate)
            return
        }

        try {
            await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
        } catch (error) {
            if (!this.ignoreOffer) {
                throw error
            }
        }
    }

    private async flushPendingCandidates(): Promise<void> {
        if (!this.peerConnection || this.pendingCandidates.length === 0) return
        const candidates = [...this.pendingCandidates]
        this.pendingCandidates = []
        for (const candidate of candidates) {
            try {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
            } catch (error) {
                console.warn("Failed to flush ICE candidate:", error)
            }
        }
    }

    async restartIce(): Promise<void> {
        if (!this.peerConnection) {
            throw new Error("WebRTC not initialized")
        }
        const offer = await this.peerConnection.createOffer({ iceRestart: true })
        await this.peerConnection.setLocalDescription(offer)
        this.callbacks.onIceRestart?.(offer)
    }

    private setupDeviceChangeListener(): void {
        if (typeof navigator === "undefined" || !navigator.mediaDevices?.addEventListener) {
            return
        }
        this.deviceChangeHandler = async () => {
            try {
                const devices = await navigator.mediaDevices.enumerateDevices()
                const audioDevices = devices.filter(
                    (d) => d.kind === "audioinput" || d.kind === "audiooutput"
                )
                this.callbacks.onDeviceChange?.(audioDevices)
            } catch {}
        }
        navigator.mediaDevices.addEventListener("devicechange", this.deviceChangeHandler)
    }

    setMicrophoneMuted(muted: boolean): void {
        if (!this.localStream) return
        for (const track of this.localStream.getAudioTracks()) {
            track.enabled = !muted
        }
    }

    isMicrophoneMuted(): boolean {
        if (!this.localStream) return true
        const audioTrack = this.localStream.getAudioTracks()[0]
        return !audioTrack?.enabled
    }

    getConnectionState(): RTCPeerConnectionState | null {
        return this.peerConnection?.connectionState || null
    }

    getLocalStream(): MediaStream | null {
        return this.localStream
    }

    async getStats(): Promise<WebRTCStats> {
        const stats: WebRTCStats = {
            connectionState: this.peerConnection?.connectionState || null,
            iceConnectionState: this.peerConnection?.iceConnectionState || null,
            signalingState: this.peerConnection?.signalingState || null,
            timestamp: Date.now(),
        }

        if (!this.peerConnection) return stats

        try {
            const report = await this.peerConnection.getStats()
            for (const stat of report.values()) {
                if (stat.type === "candidate-pair" && stat.state === "succeeded") {
                    stats.roundTripTime = stat.currentRoundTripTime
                        ? stat.currentRoundTripTime * 1000
                        : undefined
                }
                if (stat.type === "inbound-rtp" && stat.kind === "audio") {
                    stats.jitter = stat.jitter ? stat.jitter * 1000 : undefined
                    stats.packetsLost = stat.packetsLost
                    stats.packetsReceived = stat.packetsReceived
                    stats.bytesReceived = stat.bytesReceived
                    stats.audioLevel = stat.audioLevel
                }
                if (stat.type === "outbound-rtp" && stat.kind === "audio") {
                    stats.bytesSent = stat.bytesSent
                }
            }
        } catch {}

        return stats
    }

    async cleanup(): Promise<void> {
        this.pendingCandidates = []

        if (this.deviceChangeHandler && typeof navigator !== "undefined") {
            navigator.mediaDevices?.removeEventListener("devicechange", this.deviceChangeHandler)
            this.deviceChangeHandler = null
        }

        if (this.localStream) {
            for (const track of this.localStream.getTracks()) {
                track.stop()
            }
            this.localStream = null
        }

        if (this.peerConnection) {
            this.peerConnection.close()
            this.peerConnection = null
        }
    }
}
