import { useEffect, useRef, useState } from "react"

export function useMinimumLoadingDelay(isLoading: boolean, minimumMs = 400) {
    const [showLoading, setShowLoading] = useState(false)
    const loadingStartTime = useRef<number | null>(null)

    useEffect(() => {
        if (isLoading) {
            setShowLoading(true)
            loadingStartTime.current = Date.now()
        } else if (loadingStartTime.current) {
            const elapsed = Date.now() - loadingStartTime.current
            const remaining = Math.max(0, minimumMs - elapsed)

            const timer = setTimeout(() => {
                setShowLoading(false)
                loadingStartTime.current = null
            }, remaining)

            return () => clearTimeout(timer)
        }
    }, [isLoading, minimumMs])

    return showLoading
}
