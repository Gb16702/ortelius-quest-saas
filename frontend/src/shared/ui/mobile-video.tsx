import { Play } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { cn } from "@/shared/lib/class-names"

interface MobileVideoProps {
    src: string
    className?: string
}

export function MobileVideo({ src, className }: MobileVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => {
        const handleFullscreenChange = () => {
            const isFs = !!(
                document.fullscreenElement ||
                (document as Document & { webkitFullscreenElement?: Element })
                    .webkitFullscreenElement
            )
            setIsFullscreen(isFs)

            if (!isFs && videoRef.current) {
                videoRef.current.pause()
            }
        }

        document.addEventListener("fullscreenchange", handleFullscreenChange)
        document.addEventListener("webkitfullscreenchange", handleFullscreenChange)

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange)
            document.removeEventListener("webkitfullscreenchange", handleFullscreenChange)
        }
    }, [])

    const handleClick = () => {
        const video = videoRef.current
        if (!video) return

        if (video.paused) {
            video.play()
        } else {
            if (video.requestFullscreen) {
                video.requestFullscreen()
            } else if (
                (video as HTMLVideoElement & { webkitEnterFullscreen?: () => void })
                    .webkitEnterFullscreen
            ) {
                ;(
                    video as HTMLVideoElement & { webkitEnterFullscreen: () => void }
                ).webkitEnterFullscreen()
            }
        }
    }

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: role/tabIndex are conditionally applied alongside onClick — biome's static analysis cannot match the conditions
        <div
            className={cn("relative overflow-hidden rounded-sm", className)}
            onClick={isFullscreen ? undefined : handleClick}
            onKeyDown={(e) => {
                if (!isFullscreen && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault()
                    handleClick()
                }
            }}
            role={isFullscreen ? undefined : "button"}
            tabIndex={isFullscreen ? undefined : 0}
        >
            <video
                ref={videoRef}
                src={src}
                loop
                muted
                playsInline
                controls={isFullscreen}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                className="h-auto w-full cursor-pointer"
            >
                <track kind="captions" />
            </video>
            {!isPlaying && !isFullscreen && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-black/60">
                        <Play className="ml-0.5 size-6 fill-white text-white" />
                    </div>
                </div>
            )}
        </div>
    )
}
