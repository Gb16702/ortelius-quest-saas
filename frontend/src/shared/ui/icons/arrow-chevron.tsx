import { cn } from "@/shared/lib/class-names"

interface ArrowChevronProps {
    className?: string
}

export function ArrowChevron({ className }: ArrowChevronProps) {
    return (
        <svg
            viewBox="0 0 10 10"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={cn("arrow-chevron size-3.5 flex-shrink-0", className)}
            aria-hidden="true"
        >
            <path
                d="M5.5 2L8.5 5L5.5 8"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                className="arrow-chevron-path"
            />

            <path
                d="M3 5H7"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                className="arrow-line"
            />
        </svg>
    )
}
