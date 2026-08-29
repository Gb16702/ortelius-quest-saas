import { useCallback, useEffect, useRef, useState } from "react"

interface AudioAnalysisContext {
    audioContext: AudioContext
    analyser: AnalyserNode
    source: MediaStreamAudioSourceNode
}

export function useAudioAnalysis(
    localStream: MediaStream | null,
    remoteStream: MediaStream | null,
    activeCall: unknown,
    isMuted: boolean
) {
    const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null)

    const localContextRef = useRef<AudioAnalysisContext | null>(null)
    const remoteContextRef = useRef<AudioAnalysisContext | null>(null)
    const animationFrameRef = useRef<number | null>(null)
    const isMutedRef = useRef(isMuted)

    isMutedRef.current = isMuted

    const calculateAudioLevel = useCallback((analyser: AnalyserNode): number => {
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)
        analyser.getByteFrequencyData(dataArray)

        let sum = 0
        for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i]
        }
        return sum / bufferLength
    }, [])

    const determineSpeaker = useCallback((localLevel: number, remoteLevel: number) => {
        const threshold = 10
        const localSpeaking = localLevel > threshold && !isMutedRef.current
        const remoteSpeaking = remoteLevel > threshold

        if (localSpeaking && remoteLevel < localLevel) {
            return "local"
        }
        if (remoteSpeaking && localLevel < remoteLevel) {
            return "remote"
        }
        if (!localSpeaking && !remoteSpeaking) {
            return "none"
        }
        return null
    }, [])

    const analyzeAudio = useCallback(() => {
        const localLevel = localContextRef.current
            ? calculateAudioLevel(localContextRef.current.analyser)
            : 0
        const remoteLevel = remoteContextRef.current
            ? calculateAudioLevel(remoteContextRef.current.analyser)
            : 0

        const speakerResult = determineSpeaker(localLevel, remoteLevel)

        if (speakerResult === "none") {
            setCurrentSpeaker(null)
        } else if (speakerResult) {
            setCurrentSpeaker(speakerResult)
        }

        animationFrameRef.current = requestAnimationFrame(analyzeAudio)
    }, [calculateAudioLevel, determineSpeaker])

    const setupAudioContext = useCallback((stream: MediaStream): AudioAnalysisContext | null => {
        try {
            const AudioContextClass =
                window.AudioContext ||
                ((window as Window & { webkitAudioContext?: typeof AudioContext })
                    .webkitAudioContext as typeof AudioContext)
            const audioContext = new AudioContextClass()
            if (audioContext.state === "suspended") {
                audioContext.resume()
            }
            const source = audioContext.createMediaStreamSource(stream)
            const analyser = audioContext.createAnalyser()
            analyser.fftSize = 256
            analyser.smoothingTimeConstant = 0.8
            source.connect(analyser)
            return { audioContext, analyser, source }
        } catch (error) {
            console.error("Error setting up audio analysis:", error)
            return null
        }
    }, [])

    const cleanupAudioContext = useCallback((context: AudioAnalysisContext | null) => {
        if (context) {
            context.source.disconnect()
            context.audioContext.close()
        }
    }, [])

    useEffect(() => {
        if (localStream && activeCall) {
            cleanupAudioContext(localContextRef.current)
            localContextRef.current = setupAudioContext(localStream)
        }

        return () => {
            cleanupAudioContext(localContextRef.current)
            localContextRef.current = null
        }
    }, [localStream, activeCall, setupAudioContext, cleanupAudioContext])

    useEffect(() => {
        if (remoteStream && activeCall) {
            cleanupAudioContext(remoteContextRef.current)
            remoteContextRef.current = setupAudioContext(remoteStream)
            if (!animationFrameRef.current) {
                analyzeAudio()
            }
        }

        return () => {
            cleanupAudioContext(remoteContextRef.current)
            remoteContextRef.current = null
        }
    }, [remoteStream, activeCall, setupAudioContext, cleanupAudioContext, analyzeAudio])

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current)
                animationFrameRef.current = null
            }
        }
    }, [])

    return {
        currentSpeaker,
    }
}
