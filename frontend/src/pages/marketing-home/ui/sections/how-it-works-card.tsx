import { cn } from "@/shared/lib/class-names"

interface HowItWorksCardProps {
    number: string
    title: string
    description: string
    illustration: React.ReactNode
    className?: string
}

export function HowItWorksCard({
    number,
    title,
    description,
    illustration,
    className,
}: HowItWorksCardProps) {
    return (
        <div
            className={cn(
                "relative flex flex-col justify-start overflow-hidden rounded-lg border border-ds-surface-border bg-ds-surface p-6 sm:border-none sm:shadow-card",
                className
            )}
        >
            <div className="mb-4 inline-flex h-7 w-7 items-center justify-center rounded-sm bg-ds-gray-200 p-1.5">
                <span className="font-medium font-mono text-ds-fg-muted text-sm">{number}</span>
            </div>

            <h3 className="mb-1 w-fit font-semibold text-ds-fg text-lg">{title}</h3>

            <p className="mb-8 w-fit text-start text-base text-ds-fg-muted leading-relaxed">
                {description}
            </p>

            <div className="relative flex min-h-[200px] w-full items-center justify-center">
                {illustration}
            </div>
        </div>
    )
}
