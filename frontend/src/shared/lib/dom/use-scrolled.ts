import { useEffect, useState } from "react"

interface UseScrolledOptions {
    threshold?: number
}

export function useScrolled(options: UseScrolledOptions = {}) {
    const { threshold = 10 } = options
    const [isScrolled, setIsScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => {
            const scrolled = window.scrollY > threshold
            setIsScrolled(scrolled)
        }

        handleScroll()

        window.addEventListener("scroll", handleScroll, { passive: true })

        return () => {
            window.removeEventListener("scroll", handleScroll)
        }
    }, [threshold])

    return isScrolled
}
