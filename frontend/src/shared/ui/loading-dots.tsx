import type { FC, ReactNode } from "react"

interface LoadingDotsProps {
    size?: number
    children?: ReactNode
}

const LoadingDots: FC<LoadingDotsProps> = ({ size = 5, children }) => {
    return (
        <span
            className="inline-flex items-center"
            style={{
                // @ts-expect-error
                "--loading-dots-size": `${size}px`,
            }}
        >
            {children && <span className="mr-3 inline-block">{children}</span>}
            <span className="mx-[1px] inline-block h-[var(--loading-dots-size)] w-[var(--loading-dots-size)] animate-loading-dots-blink rounded-full bg-ds-inverse-surface" />
            <span className="mx-[1px] inline-block h-[var(--loading-dots-size)] w-[var(--loading-dots-size)] animate-loading-dots-blink rounded-full bg-ds-inverse-surface delay-200" />
            <span className="mx-[1px] inline-block h-[var(--loading-dots-size)] w-[var(--loading-dots-size)] animate-loading-dots-blink rounded-full bg-ds-inverse-surface [animation-delay:400ms]" />
        </span>
    )
}

export { LoadingDots }
