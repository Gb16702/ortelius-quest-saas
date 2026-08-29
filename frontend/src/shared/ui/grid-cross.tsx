interface GridCrossProps {
    className?: string
}

export function GridCross({ className = "" }: GridCrossProps) {
    return (
        <div
            className={`pointer-events-none absolute z-100 flex items-center justify-center ${className}`}
            data-grid-cross
        >
            <div className="absolute h-[24px] w-[1px] bg-ds-surface-border" />
            <div className="absolute h-[1px] w-[24px] bg-ds-surface-border" />
        </div>
    )
}
