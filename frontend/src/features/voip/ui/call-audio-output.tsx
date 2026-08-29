import { Volume2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { Button } from "@/shared/ui/button"

interface CallAudioOutputProps {
    remoteStream?: MediaStream | null
    localStream?: MediaStream | null
}

/**
 * Renders the active call's `<audio>` elements at the manager level so the
 * stream is not torn down when switching between minimized and maximized
 * views. Also surfaces a manual "Enable sound" button if the browser blocks
 * autoplay (NotAllowedError) — a single user gesture unblocks playback.
 */
export function CallAudioOutput({ remoteStream, localStream }: CallAudioOutputProps) {
    const remoteAudioRef = useRef<HTMLAudioElement>(null)
    const localAudioRef = useRef<HTMLAudioElement>(null)
    const [needsUserGesture, setNeedsUserGesture] = useState(false)

    useEffect(() => {
        if (!remoteStream || !remoteAudioRef.current) return
        const audio = remoteAudioRef.current
        audio.srcObject = remoteStream
        audio.play().then(
            () => setNeedsUserGesture(false),
            (error: DOMException) => {
                if (error.name === "NotAllowedError") {
                    setNeedsUserGesture(true)
                } else {
                    console.error("Error playing remote audio:", error)
                }
            }
        )
    }, [remoteStream])

    useEffect(() => {
        if (!localStream || !localAudioRef.current) return
        localAudioRef.current.srcObject = localStream
        localAudioRef.current.muted = true
    }, [localStream])

    const handleEnableSound = () => {
        remoteAudioRef.current?.play().then(
            () => setNeedsUserGesture(false),
            (error) => console.error("Error playing remote audio after gesture:", error)
        )
    }

    return (
        <>
            <audio ref={localAudioRef} autoPlay muted>
                <track kind="captions" src="" srcLang="en" label="Local audio" default />
            </audio>
            <audio ref={remoteAudioRef} autoPlay>
                <track kind="captions" src="" srcLang="en" label="Remote audio" default />
            </audio>
            {needsUserGesture && (
                <div className="fixed top-4 left-1/2 z-[60] -translate-x-1/2 transform">
                    <Button
                        type="button"
                        variant="brand"
                        size="sm"
                        radius="full"
                        onClick={handleEnableSound}
                    >
                        <Volume2 className="mr-2 size-4" />
                        Activer le son
                    </Button>
                </div>
            )}
        </>
    )
}
