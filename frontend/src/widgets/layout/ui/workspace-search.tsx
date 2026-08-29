import { Search } from "lucide-react"
import type { ComponentType, SVGProps } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { Input } from "@/shared/ui/input"
import { Kbd } from "@/shared/ui/kbd"

export interface SearchableItem {
    title: string
    subtitle?: string
    url?: string
    onAction?: () => void
    onIntent?: () => void
    icon?: ComponentType<SVGProps<SVGSVGElement>>
}

interface WorkspaceSearchProps {
    items: SearchableItem[]
    onNavigate?: (url: string) => void
}

interface PanelPosition {
    top: number
    left: number
    width: number
}

export function WorkspaceSearch({ items, onNavigate }: WorkspaceSearchProps) {
    const { t } = useTranslation("workspace")
    const [isOpen, setIsOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [selectedIndex, setSelectedIndex] = useState(0)
    const [panelPos, setPanelPos] = useState<PanelPosition | null>(null)
    const triggerRef = useRef<HTMLButtonElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLDivElement>(null)

    const filteredItems = useMemo(
        () =>
            (query.trim() === ""
                ? items
                : items.filter((item) => item.title.toLowerCase().includes(query.toLowerCase()))
            ).slice(0, 6),
        [items, query]
    )

    const handleOpen = useCallback(() => {
        const viewportPadding = 12
        const panelWidth = Math.min(400, window.innerWidth - viewportPadding * 2)
        const triggerRect = triggerRef.current?.getBoundingClientRect()
        const top = triggerRect ? triggerRect.bottom + 8 : 56
        const preferredLeft = triggerRect
            ? triggerRect.right - panelWidth
            : window.innerWidth - panelWidth - viewportPadding
        const maxLeft = window.innerWidth - panelWidth - viewportPadding
        const left = Math.min(Math.max(preferredLeft, viewportPadding), maxLeft)

        setPanelPos({ top, left, width: panelWidth })
        setIsOpen(true)
        setQuery("")
        setSelectedIndex(0)
        requestAnimationFrame(() => inputRef.current?.focus())
    }, [])

    const handleClose = useCallback(() => {
        setIsOpen(false)
        setQuery("")
        setSelectedIndex(0)
        setPanelPos(null)
    }, [])

    const handleSelect = (item: SearchableItem) => {
        item.onIntent?.()
        handleClose()
        if (item.onAction) {
            item.onAction()
        } else if (item.url) {
            if (onNavigate) {
                onNavigate(item.url)
                return
            }
            window.location.assign(item.url)
        }
    }

    useEffect(() => {
        setIsOpen(false)
        setQuery("")
        setSelectedIndex(0)
        setPanelPos(null)
    }, [])

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (isOpen && e.key === "Escape") {
                e.preventDefault()
                handleClose()
                return
            }

            if (!isOpen) {
                const target = e.target as HTMLElement
                const isTyping =
                    target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable

                if (e.key === "f" && !isTyping && !e.metaKey && !e.ctrlKey && !e.altKey) {
                    e.preventDefault()
                    handleOpen()
                }
            }
        }

        window.addEventListener("keydown", onKeyDown)
        return () => window.removeEventListener("keydown", onKeyDown)
    }, [isOpen, handleClose, handleOpen])

    useEffect(() => {
        if (!isOpen || !listRef.current) return
        const el = listRef.current.querySelector(`[data-index="${selectedIndex}"]`)
        el?.scrollIntoView({ block: "nearest" })
        filteredItems[selectedIndex]?.onIntent?.()
    }, [filteredItems, selectedIndex, isOpen])

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIndex((prev) => Math.min(prev + 1, filteredItems.length - 1))
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIndex((prev) => Math.max(prev - 1, 0))
        } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
            e.preventDefault()
            handleSelect(filteredItems[selectedIndex])
        }
    }

    return (
        <>
            <button
                ref={triggerRef}
                type="button"
                aria-label={t("sidebar.searchPlaceholder")}
                onClick={handleOpen}
                className={cn(
                    "hidden size-7 items-center justify-center rounded-full text-ds-fg outline-none transition-colors",
                    "hover:bg-ds-surface-interactive hover:text-ds-fg focus-visible:ring-[3px] focus-visible:ring-ds-gray-alpha-300 md:flex"
                )}
            >
                <Search className="size-4 shrink-0 stroke-[2.1px]" />
            </button>

            {isOpen &&
                panelPos &&
                typeof document !== "undefined" &&
                createPortal(
                    <>
                        <button
                            type="button"
                            aria-label="Close search"
                            className="fixed inset-0 z-50 bg-ds-canvas/50"
                            onClick={handleClose}
                        />

                        <div
                            className="fixed z-[51]"
                            style={{
                                top: panelPos.top,
                                left: panelPos.left,
                                width: panelPos.width,
                            }}
                        >
                            <div className="overflow-hidden rounded-sm bg-ds-surface shadow-dropdown">
                                <div className="relative">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 stroke-[1.6px] text-ds-fg-muted" />
                                    <Input
                                        ref={inputRef}
                                        type="text"
                                        value={query}
                                        onChange={(e) => {
                                            setQuery(e.target.value)
                                            setSelectedIndex(0)
                                        }}
                                        onKeyDown={handleInputKeyDown}
                                        placeholder={t("sidebar.searchPlaceholder")}
                                        className="w-full rounded-none border-0 pr-14 pl-10 shadow-none focus-visible:ring-0"
                                        size="sm"
                                    />
                                    <div className="absolute top-1/2 right-3 -translate-y-1/2">
                                        <Kbd>Esc</Kbd>
                                    </div>
                                </div>

                                <div className="border-ds-surface-border border-t" />

                                <div
                                    ref={listRef}
                                    className="max-h-[min(420px,60vh)] overflow-y-auto p-2"
                                >
                                    {filteredItems.length === 0 ? (
                                        <div className="flex items-center justify-center py-8 text-ds-fg-muted text-sm">
                                            {t("sidebar.searchEmpty")}
                                        </div>
                                    ) : (
                                        filteredItems.map((item, index) => {
                                            const Icon = item.icon
                                            return (
                                                <button
                                                    key={`${item.title}-${item.subtitle ?? ""}`}
                                                    type="button"
                                                    data-index={index}
                                                    onClick={() => handleSelect(item)}
                                                    onFocus={() => item.onIntent?.()}
                                                    onMouseEnter={() => {
                                                        item.onIntent?.()
                                                        setSelectedIndex(index)
                                                    }}
                                                    onPointerDown={() => item.onIntent?.()}
                                                    className={cn(
                                                        "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-xs",
                                                        index === selectedIndex &&
                                                            "bg-ds-surface-interactive"
                                                    )}
                                                >
                                                    {Icon && (
                                                        <Icon className="size-4 shrink-0 stroke-[1.6px] text-ds-fg-muted" />
                                                    )}
                                                    <div className="min-w-0 flex-1">
                                                        <div className="truncate font-medium text-ds-fg">
                                                            {item.title}
                                                        </div>
                                                        {item.subtitle && (
                                                            <div className="truncate font-normal text-ds-fg-muted text-xs">
                                                                {item.subtitle}
                                                            </div>
                                                        )}
                                                    </div>
                                                </button>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </>
    )
}
