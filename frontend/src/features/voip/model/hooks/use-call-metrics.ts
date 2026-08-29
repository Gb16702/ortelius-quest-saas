import { useEffect, useRef } from "react"
import type { WebRTCService } from "@/shared/api/webrtc/web-rtc"
import { useCallStore } from "../use-call.store"

const SAMPLE_INTERVAL_MS = 5_000
const FLUSH_BATCH_SIZE = 6

type Sample = {
    timestamp: string
    metrics: {
        connection?: Record<string, unknown>
        audio?: Record<string, unknown>
    }
}

type Options = {
    getWebRtc: () => WebRTCService | null
}

async function postMetricsBatch(callId: string, samples: Sample[]): Promise<void> {
    if (samples.length === 0) return
    try {
        await fetch(`/api/calls/${callId}/metrics`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ samples }),
            keepalive: true,
        })
    } catch (error) {
        // Metrics are best-effort; never disrupt the call on failure.
        console.warn("Failed to post call metrics batch", error)
    }
}

export function useCallMetrics({ getWebRtc }: Options) {
    const samplesRef = useRef<Sample[]>([])
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
    const activeCallIdRef = useRef<string | null>(null)

    useEffect(() => {
        const unsubscribe = useCallStore.subscribe(
            (s) => s.activeCall?.id ?? null,
            (callId) => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current)
                    intervalRef.current = null
                }
                // Flush any leftover samples for the previous call before
                // we forget which callId they belonged to.
                const prevCallId = activeCallIdRef.current
                if (prevCallId && samplesRef.current.length > 0) {
                    void postMetricsBatch(prevCallId, samplesRef.current.splice(0))
                }
                samplesRef.current = []
                activeCallIdRef.current = callId
                if (!callId) return

                intervalRef.current = setInterval(async () => {
                    const webrtc = getWebRtc()
                    if (!webrtc) return
                    const stats = await webrtc.getStats().catch(() => null)
                    if (!stats || !useCallStore.getState().activeCall?.id) return

                    samplesRef.current.push({
                        timestamp: new Date().toISOString(),
                        metrics: {
                            connection: {
                                state: stats.connectionState,
                                iceConnectionState: stats.iceConnectionState,
                                roundTripTime: stats.roundTripTime,
                                bytesReceived: stats.bytesReceived,
                                bytesSent: stats.bytesSent,
                            },
                            audio: {
                                jitter: stats.jitter,
                                packetsLost: stats.packetsLost,
                                packetsReceived: stats.packetsReceived,
                                audioLevel: stats.audioLevel,
                            },
                        },
                    })

                    if (samplesRef.current.length >= FLUSH_BATCH_SIZE) {
                        const batch = samplesRef.current.splice(0)
                        void postMetricsBatch(callId, batch)
                    }
                }, SAMPLE_INTERVAL_MS)
            },
            { fireImmediately: true }
        )

        return () => {
            unsubscribe()
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            const remaining = samplesRef.current.splice(0)
            const callId = activeCallIdRef.current
            if (remaining.length > 0 && callId) {
                void postMetricsBatch(callId, remaining)
            }
        }
    }, [getWebRtc])
}
