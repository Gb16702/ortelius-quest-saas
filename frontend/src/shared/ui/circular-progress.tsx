import { cn } from "@/shared/lib/class-names"

interface CircularProgressProps {
    value: number
    max: number
    size?: number
    strokeWidth?: number
    className?: string
}

export function CircularProgress({
    value,
    max,
    size = 24,
    strokeWidth = 3,
    className,
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const progress = max > 0 ? (value / max) * circumference : 0
    const offset = circumference - progress

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className={cn("rotate-[-90deg]", className)}
            aria-hidden="true"
        >
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                className="text-ds-gray-400"
            />
            <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-500"
            />
        </svg>
    )
}
