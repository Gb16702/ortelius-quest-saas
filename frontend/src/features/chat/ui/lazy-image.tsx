import { useEffect, useRef, useState } from "react"

interface LazyImageProps {
    src: string
    alt: string
    className?: string
    onClick?: () => void
}

export function LazyImage({ src, alt, className, onClick }: LazyImageProps) {
    const [isLoaded, setIsLoaded] = useState(false)
    const [isInView, setIsInView] = useState(false)
    const imgRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        setIsLoaded(false)
        setIsInView(false)

        if (!imgRef.current) return

        const element = imgRef.current

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setIsInView(true)
                        observer.disconnect()
                    }
                })
            },
            {
                rootMargin: "50px",
                threshold: 0.01,
            }
        )

        observer.observe(element)

        return () => {
            observer.disconnect()
        }
    }, [])

    return (
        // biome-ignore lint/a11y/noStaticElementInteractions: role/tabIndex are conditionally applied alongside onClick — biome's static analysis cannot match the conditions
        <div
            ref={imgRef}
            className={className}
            onClick={onClick}
            onKeyDown={
                onClick
                    ? (e) => {
                          if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault()
                              onClick()
                          }
                      }
                    : undefined
            }
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
        >
            {!isInView && (
                <div className="flex h-full w-full items-center justify-center bg-ds-surface-interactive" />
            )}
            {isInView && (
                <>
                    {!isLoaded && (
                        <div className="absolute inset-0 flex items-center justify-center bg-ds-surface-interactive" />
                    )}
                    <img
                        src={src}
                        alt={alt}
                        className={`h-full w-full object-cover transition-opacity duration-300 ${
                            isLoaded ? "opacity-100" : "opacity-0"
                        }`}
                        onLoad={() => setIsLoaded(true)}
                    />
                </>
            )}
        </div>
    )
}
