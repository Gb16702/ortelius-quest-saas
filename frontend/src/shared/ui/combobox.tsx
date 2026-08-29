import { Search, X } from "lucide-react"
import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from "react"
import { cn } from "@/shared/lib/class-names"
import type { FieldControlSize } from "@/shared/ui/field-control-shape"
import { Input } from "@/shared/ui/input"
import { Spinner } from "@/shared/ui/spinner"

export interface ComboboxOption {
    value: string
    label: ReactNode
    onSelect: () => void
    className?: string
}

interface ComboboxProps {
    value: string
    onValueChange: (value: string) => void
    options: ComboboxOption[]
    placeholder?: string
    emptyMessage?: string
    disabled?: boolean
    className?: string
    footer?: ComboboxOption
    showSearchIcon?: boolean
    loading?: boolean
    size?: FieldControlSize
}

export function Combobox({
    value,
    onValueChange,
    options,
    placeholder,
    emptyMessage = "No matches found",
    disabled,
    className,
    footer,
    showSearchIcon = true,
    loading = false,
    size = "default",
}: ComboboxProps) {
    const [open, setOpen] = useState(false)
    const [activeIdx, setActiveIdx] = useState(0)
    const containerRef = useRef<HTMLDivElement>(null)

    const items = footer ? [...options, footer] : options

    useEffect(() => {
        setActiveIdx(0)
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const showDropdown = open && (options.length > 0 || Boolean(footer) || Boolean(value.trim()))

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || items.length === 0) return
        if (e.key === "ArrowDown") {
            e.preventDefault()
            setActiveIdx((i) => (i + 1) % items.length)
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setActiveIdx((i) => (i - 1 + items.length) % items.length)
        } else if (e.key === "Enter") {
            e.preventDefault()
            const item = items[activeIdx]
            if (item) {
                item.onSelect()
                setOpen(false)
            }
        } else if (e.key === "Escape") {
            setOpen(false)
        }
    }

    return (
        <div ref={containerRef} className={cn("relative", className)}>
            <div className="relative">
                {showSearchIcon &&
                    (loading ? (
                        <Spinner className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                    ) : (
                        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                    ))}
                <Input
                    type="text"
                    value={value}
                    onChange={(e) => {
                        onValueChange(e.target.value)
                        setOpen(true)
                    }}
                    onFocus={() => setOpen(true)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={disabled}
                    size={size}
                    className={cn(showSearchIcon && "pl-9", value && "pr-9")}
                    aria-autocomplete="list"
                    aria-expanded={showDropdown}
                    role="combobox"
                />
                {value && !disabled && (
                    <button
                        type="button"
                        onClick={() => {
                            onValueChange("")
                            setOpen(false)
                        }}
                        aria-label="Clear"
                        className="absolute top-1/2 right-2 -translate-y-1/2 rounded-sm p-1 text-ds-fg-muted hover:text-ds-fg"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            {showDropdown && (
                <ul className="absolute top-full right-0 left-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-md bg-ds-surface p-2 shadow-[var(--shadow-dropdown)]">
                    {items.length === 0 && (
                        <li className="px-3 py-2 text-center text-ds-fg-muted text-sm">
                            {emptyMessage}
                        </li>
                    )}
                    {items.map((item, idx) => {
                        const active = idx === activeIdx
                        const isFooter = footer && idx === items.length - 1
                        return (
                            <li key={item.value}>
                                <button
                                    type="button"
                                    role="option"
                                    aria-selected={active}
                                    onMouseEnter={() => setActiveIdx(idx)}
                                    onClick={() => {
                                        item.onSelect()
                                        setOpen(false)
                                    }}
                                    className={cn(
                                        "block w-full truncate rounded-sm px-3 py-2.5 text-left font-normal text-sm",
                                        isFooter ? "text-ds-fg-muted" : "text-ds-fg",
                                        active && "bg-ds-surface-interactive",
                                        item.className
                                    )}
                                >
                                    {item.label}
                                </button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}
