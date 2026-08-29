import { cn } from "@/shared/lib/class-names"

const colorPresets = {
    "text-primary": "#111827",
    "text-secondary": "#6b7280",
    "text-tertiary": "#9ca3af",
    "gray-100": "#f3f4f6",
    "gray-200": "#e5e7eb",
    "gray-300": "#bbbbbb",
    "gray-400": "#9ca3af",
    "gray-500": "#6b7280",
    "gray-600": "#4b5563",
    "gray-700": "#374151",
    "gray-800": "#1f2937",
    "gray-900": "#171717",
} as const

type ColorPreset = keyof typeof colorPresets

interface DottedLinesProps {
    className?: string
    color?: ColorPreset | (string & {})
    opacity?: number
    top?: boolean | { fadeStart?: string; fadeEnd?: string; overflow?: string }
    bottom?: boolean | { fadeStart?: string; fadeEnd?: string; overflow?: string }
    left?: boolean | { fadeStart?: string; fadeEnd?: string; overflow?: string }
    right?: boolean | { fadeStart?: string; fadeEnd?: string; overflow?: string }
    centerVertical?: boolean | { fadeStart?: string; fadeEnd?: string; overflow?: string }
    centerHorizontal?: boolean | { fadeStart?: string; fadeEnd?: string; overflow?: string }
}

function resolveColor(color: string): string {
    if (color in colorPresets) {
        return colorPresets[color as ColorPreset]
    }
    return color
}

const horizontalPattern = (color: string) =>
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 1'%3E%3Crect width='1' height='1' fill='${encodeURIComponent(resolveColor(color))}'/%3E%3C/svg%3E")`

const verticalPattern = (color: string) =>
    `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1 4'%3E%3Crect width='1' height='1' fill='${encodeURIComponent(resolveColor(color))}'/%3E%3C/svg%3E")`

function getHorizontalConfig(
    config: boolean | { fadeStart?: string; fadeEnd?: string; overflow?: string }
) {
    if (typeof config !== "object") {
        return { fadeStart: "7rem", fadeEnd: "7rem", overflow: "7rem" }
    }
    return {
        fadeStart: config.fadeStart ?? "7rem",
        fadeEnd: config.fadeEnd ?? "7rem",
        overflow: config.overflow ?? "7rem",
    }
}

function getVerticalConfig(
    config: boolean | { fadeStart?: string; fadeEnd?: string; overflow?: string }
) {
    if (typeof config !== "object") {
        return { fadeStart: "5rem", fadeEnd: "0rem", overflow: "5rem" }
    }
    return {
        fadeStart: config.fadeStart ?? "5rem",
        fadeEnd: config.fadeEnd ?? "0rem",
        overflow: config.overflow ?? "5rem",
    }
}

export function DottedLines({
    className,
    color = "#212126",
    opacity = 30,
    top,
    bottom,
    left,
    right,
    centerVertical,
    centerHorizontal,
}: DottedLinesProps) {
    const opacityClass = `opacity-${opacity}`

    return (
        <div className={cn("pointer-events-none absolute inset-0 z-0 hidden md:block", className)}>
            {top &&
                (() => {
                    const config = getHorizontalConfig(top)
                    return (
                        <div
                            className={cn("absolute inset-x-0 -top-px h-px", opacityClass)}
                            style={{
                                backgroundImage: horizontalPattern(color),
                                maskImage: `linear-gradient(to right, transparent, white ${config.fadeStart}, white calc(100% - ${config.fadeEnd}), transparent)`,
                                marginLeft: `-${config.overflow}`,
                                marginRight: `-${config.overflow}`,
                            }}
                        />
                    )
                })()}

            {bottom &&
                (() => {
                    const config = getHorizontalConfig(bottom)
                    return (
                        <div
                            className={cn("absolute inset-x-0 -bottom-px h-px", opacityClass)}
                            style={{
                                backgroundImage: horizontalPattern(color),
                                maskImage: `linear-gradient(to right, transparent, white ${config.fadeStart}, white calc(100% - ${config.fadeEnd}), transparent)`,
                                marginLeft: `-${config.overflow}`,
                                marginRight: `-${config.overflow}`,
                            }}
                        />
                    )
                })()}

            {left &&
                (() => {
                    const config = getVerticalConfig(left)
                    return (
                        <div
                            className={cn("absolute inset-y-0 -left-px w-px", opacityClass)}
                            style={{
                                backgroundImage: verticalPattern(color),
                                maskImage: `linear-gradient(transparent, white ${config.fadeStart}, white calc(100% - ${config.fadeEnd}), transparent)`,
                                marginTop: `-${config.overflow}`,
                                marginBottom: `-${config.fadeEnd}`,
                            }}
                        />
                    )
                })()}

            {right &&
                (() => {
                    const config = getVerticalConfig(right)
                    return (
                        <div
                            className={cn("absolute inset-y-0 -right-px w-px", opacityClass)}
                            style={{
                                backgroundImage: verticalPattern(color),
                                maskImage: `linear-gradient(transparent, white ${config.fadeStart}, white calc(100% - ${config.fadeEnd}), transparent)`,
                                marginTop: `-${config.overflow}`,
                                marginBottom: `-${config.fadeEnd}`,
                            }}
                        />
                    )
                })()}

            {centerVertical &&
                (() => {
                    const config = getVerticalConfig(centerVertical)
                    return (
                        <div
                            className={cn(
                                "absolute inset-y-0 left-1/2 w-px -translate-x-1/2",
                                opacityClass
                            )}
                            style={{
                                backgroundImage: verticalPattern(color),
                                maskImage: `linear-gradient(transparent, white ${config.fadeStart}, white calc(100% - ${config.fadeEnd}), transparent)`,
                                marginTop: `-${config.overflow}`,
                                marginBottom: `-${config.fadeEnd}`,
                            }}
                        />
                    )
                })()}

            {centerHorizontal &&
                (() => {
                    const config = getHorizontalConfig(centerHorizontal)
                    return (
                        <div
                            className={cn(
                                "absolute inset-x-0 top-1/2 h-px -translate-y-1/2",
                                opacityClass
                            )}
                            style={{
                                backgroundImage: horizontalPattern(color),
                                maskImage: `linear-gradient(to right, transparent, white ${config.fadeStart}, white calc(100% - ${config.fadeEnd}), transparent)`,
                                marginLeft: `-${config.overflow}`,
                                marginRight: `-${config.overflow}`,
                            }}
                        />
                    )
                })()}
        </div>
    )
}
