import { useEffect, useRef, useState } from "react"

interface TocItem {
    id: string
    text: string
    level: number
}

interface TableOfContentsProps {
    items: TocItem[]
}

export function TableOfContents({ items }: TableOfContentsProps) {
    const [activeId, setActiveId] = useState<string>("")
    const [indicatorStyle, setIndicatorStyle] = useState({ top: 0, height: 0 })
    const navRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id)
                    }
                })
            },
            {
                rootMargin: "-20% 0px -35% 0px",
                threshold: [0, 1],
            }
        )

        const headings = items.map((item) => document.getElementById(item.id))
        headings.forEach((heading) => {
            if (heading) {
                observer.observe(heading)
            }
        })

        return () => {
            headings.forEach((heading) => {
                if (heading) {
                    observer.unobserve(heading)
                }
            })
        }
    }, [items])

    useEffect(() => {
        if (!activeId || !navRef.current) return

        const activeButton = navRef.current.querySelector(
            `button[data-id="${activeId}"]`
        ) as HTMLElement

        if (activeButton) {
            const navTop = navRef.current.getBoundingClientRect().top
            const buttonTop = activeButton.getBoundingClientRect().top
            const relativeTop = buttonTop - navTop
            const buttonHeight = activeButton.offsetHeight

            setIndicatorStyle({
                top: relativeTop,
                height: buttonHeight,
            })
        }
    }, [activeId])

    const handleClick = (id: string) => {
        const element = document.getElementById(id)
        if (element) {
            const offset = 100
            const elementPosition = element.getBoundingClientRect().top
            const offsetPosition = elementPosition + window.scrollY - offset

            window.scrollTo({
                top: offsetPosition,
                behavior: "smooth",
            })
        }
    }

    if (items.length === 0) {
        return null
    }

    return (
        <nav className="sticky top-24 hidden lg:block">
            <div className="relative flex">
                <div className="absolute inset-y-0 left-0 w-px bg-ds-gray-500/70">
                    <div
                        className="absolute left-0 w-px bg-ds-inverse-surface transition-all duration-300 ease-out"
                        style={{
                            top: `${indicatorStyle.top}px`,
                            height: `${indicatorStyle.height}px`,
                        }}
                    />
                </div>
                <div ref={navRef} className="space-y-4 pl-4">
                    {items.map((item) => {
                        const isActive = activeId === item.id
                        const isSubItem = item.level > 2

                        return (
                            <button
                                type="button"
                                key={item.id}
                                data-id={item.id}
                                onClick={() => handleClick(item.id)}
                                className={`block w-full text-left font-normal text-xs transition-colors ${isSubItem ? "pl-4" : ""}
                                    ${isActive ? "text-ds-fg" : "text-ds-fg-muted hover:text-ds-fg"}
                                `}
                            >
                                {item.text}
                            </button>
                        )
                    })}
                </div>
            </div>
        </nav>
    )
}
