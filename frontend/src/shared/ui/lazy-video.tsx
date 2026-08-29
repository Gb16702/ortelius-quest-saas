import { useEffect, useRef } from "react"
import { cn } from "@/shared/lib/class-names"

interface LazyVideoProps {
    src: string
    className?: string
}

export function LazyVideo({ src, className }: LazyVideoProps) {
    const videoRef = useRef<HTMLVideoElement>(null)

    useEffect(() => {
        const video = videoRef.current
        if (!video) return

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        video.play()
                    } else {
                        video.pause()
                    }
                })
            },
            {
                threshold: 0.5,
            }
        )

        observer.observe(video)

        return () => {
            observer.disconnect()
        }
    }, [])

    return (
        <video
            ref={videoRef}
            src={src}
            loop
            muted
            playsInline
            className={cn("h-full w-full object-fill", className)}
        />
    )
}
