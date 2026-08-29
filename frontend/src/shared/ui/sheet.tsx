import * as SheetPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import type * as React from "react"
import { useCallback, useLayoutEffect, useRef, useState } from "react"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"

interface SheetScrollFadeState {
    showTop: boolean
    showBottom: boolean
}

const sheetScrollTopFadeStyle = {
    background:
        "linear-gradient(to bottom, var(--color-ds-surface) 0%, color-mix(in srgb, var(--color-ds-surface) 92%, transparent) 48%, transparent 100%)",
}

const sheetScrollBottomFadeStyle = {
    background:
        "linear-gradient(to top, var(--color-ds-surface) 0%, color-mix(in srgb, var(--color-ds-surface) 92%, transparent) 48%, transparent 100%)",
}

function Sheet({ ...props }: React.ComponentProps<typeof SheetPrimitive.Root>) {
    return <SheetPrimitive.Root data-slot="sheet" {...props} />
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />
}

function SheetClose({ ...props }: React.ComponentProps<typeof SheetPrimitive.Close>) {
    return <SheetPrimitive.Close data-slot="sheet-close" {...props} />
}

function SheetPortal({ ...props }: React.ComponentProps<typeof SheetPrimitive.Portal>) {
    return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
}

function SheetOverlay({
    className,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Overlay>) {
    return (
        <SheetPrimitive.Overlay
            data-slot="sheet-overlay"
            className={cn(
                "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-ds-canvas/[.5] data-[state=closed]:animate-out data-[state=open]:animate-in",
                className
            )}
            {...props}
        />
    )
}

function SheetContent({
    className,
    children,
    side = "right",
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
    side?: "top" | "right" | "bottom" | "left"
}) {
    return (
        <SheetPortal>
            <SheetOverlay />
            <SheetPrimitive.Content
                data-slot="sheet-content"
                className={cn(
                    "fixed z-50 flex flex-col overflow-hidden outline-none ring-none transition ease-in-out data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:duration-100 data-[state=open]:duration-250",
                    side === "right" &&
                        "data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right inset-y-0 right-0 h-full w-5/10 max-w-4xl",
                    side === "left" &&
                        "data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
                    side === "top" &&
                        "data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top inset-x-0 top-0 h-auto border-b",
                    side === "bottom" &&
                        "data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom right-0 bottom-0 left-0 h-auto [box-shadow:var(--shadow-bottom-sheet)]",
                    className
                )}
                {...props}
            >
                {children}
            </SheetPrimitive.Content>
        </SheetPortal>
    )
}

function SheetScrollArea({ className, children, onScroll, ...props }: React.ComponentProps<"div">) {
    const scrollContainerRef = useRef<HTMLDivElement>(null)
    const scrollContentRef = useRef<HTMLDivElement>(null)
    const [scrollFadeState, setScrollFadeState] = useState<SheetScrollFadeState>({
        showTop: false,
        showBottom: true,
    })

    const updateScrollFadeState = useCallback(() => {
        const scrollElement = scrollContainerRef.current

        if (!scrollElement) {
            setScrollFadeState({ showTop: false, showBottom: false })
            return
        }

        const { scrollTop, scrollHeight, clientHeight } = scrollElement
        const maxScrollTop = scrollHeight - clientHeight
        const hasScrollableContent = maxScrollTop > 1
        const nextState = {
            showTop: hasScrollableContent && scrollTop > 1,
            showBottom: hasScrollableContent && scrollTop < maxScrollTop - 1,
        }

        setScrollFadeState((previousState) => {
            if (
                previousState.showTop === nextState.showTop &&
                previousState.showBottom === nextState.showBottom
            ) {
                return previousState
            }

            return nextState
        })
    }, [])

    useLayoutEffect(() => {
        const scrollElement = scrollContainerRef.current
        const contentElement = scrollContentRef.current

        if (!scrollElement || !contentElement) {
            setScrollFadeState({ showTop: false, showBottom: false })
            return
        }

        let delayedAnimationFrameId: number | null = null
        const animationFrameId = window.requestAnimationFrame(updateScrollFadeState)
        const outerAnimationFrameId = window.requestAnimationFrame(() => {
            delayedAnimationFrameId = window.requestAnimationFrame(updateScrollFadeState)
        })
        const timeoutId = window.setTimeout(updateScrollFadeState, 100)
        const resizeObserver = new ResizeObserver(updateScrollFadeState)
        const mutationObserver = new MutationObserver(updateScrollFadeState)

        resizeObserver.observe(scrollElement)
        resizeObserver.observe(contentElement)
        mutationObserver.observe(contentElement, {
            attributes: true,
            childList: true,
            subtree: true,
        })
        window.addEventListener("resize", updateScrollFadeState)

        return () => {
            window.cancelAnimationFrame(animationFrameId)
            window.cancelAnimationFrame(outerAnimationFrameId)
            if (delayedAnimationFrameId !== null) {
                window.cancelAnimationFrame(delayedAnimationFrameId)
            }
            window.clearTimeout(timeoutId)
            resizeObserver.disconnect()
            mutationObserver.disconnect()
            window.removeEventListener("resize", updateScrollFadeState)
        }
    }, [updateScrollFadeState])

    const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
        updateScrollFadeState()
        onScroll?.(event)
    }

    return (
        <div data-slot="sheet-scroll-area" className="relative min-h-0 flex-1 overflow-hidden">
            <div
                ref={scrollContainerRef}
                className={cn("h-full overflow-y-auto overscroll-contain", className)}
                onScroll={handleScroll}
                {...props}
            >
                <div ref={scrollContentRef}>{children}</div>
            </div>
            <div
                aria-hidden="true"
                className={cn(
                    "pointer-events-none absolute inset-x-0 top-0 z-50 h-12 transition-opacity duration-150",
                    scrollFadeState.showTop ? "opacity-100" : "opacity-0"
                )}
                style={sheetScrollTopFadeStyle}
            />
            <div
                aria-hidden="true"
                className={cn(
                    "pointer-events-none absolute inset-x-0 bottom-0 z-50 h-12 transition-opacity duration-150",
                    scrollFadeState.showBottom ? "opacity-100" : "opacity-0"
                )}
                style={sheetScrollBottomFadeStyle}
            />
        </div>
    )
}

function SheetHeader({
    className,
    showClose = true,
    ...props
}: React.ComponentProps<"div"> & { showClose?: boolean }) {
    return (
        <div
            data-slot="sheet-header"
            className={cn("flex items-center justify-between px-8 py-6", className)}
            {...props}
        >
            <div className="flex flex-1 flex-col gap-1.5">{props.children}</div>
            {showClose && (
                <SheetPrimitive.Close asChild>
                    <Button variant="outline" radius="full" size="icon" className="ml-4">
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                    </Button>
                </SheetPrimitive.Close>
            )}
        </div>
    )
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="sheet-footer"
            className={cn(
                "mt-auto flex w-full shrink-0 flex-col gap-3 pt-6",
                "sticky -bottom-4 pb-4",
                "bg-gradient-to-b from-transparent via-10% via-ds-surface to-ds-surface",
                className
            )}
            {...props}
        />
    )
}

function SheetTitle({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Title>) {
    return (
        <SheetPrimitive.Title data-slot="sheet-title" asChild {...props}>
            <h1
                className={cn(
                    "font-medium text-2xl text-ds-fg leading-[1.4] tracking-tight",
                    className
                )}
            >
                {children}
            </h1>
        </SheetPrimitive.Title>
    )
}

function SheetDescription({
    className,
    ...props
}: React.ComponentProps<typeof SheetPrimitive.Description>) {
    return (
        <SheetPrimitive.Description
            data-slot="sheet-description"
            className={cn("mt-1.5 text-ds-fg", className)}
            {...props}
        />
    )
}

export {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetScrollArea,
    SheetTitle,
    SheetTrigger,
}
