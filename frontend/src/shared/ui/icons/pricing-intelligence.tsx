interface PricingIntelligenceProps {
    className?: string
}

export const PricingIntelligence = ({ className = "size-4" }: PricingIntelligenceProps) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
        >
            <title>Pricing intelligence</title>
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M3 12l8.5 8.5a1.5 1.5 0 0 0 2.12 0l6.88 -6.88a1.5 1.5 0 0 0 0 -2.12l-8.5 -8.5h-7a2 2 0 0 0 -2 2z" />
            <path d="M7 7l.01 0" />
            <path d="M9 15l5 -5" />
            <path d="M11 10h3v3" />
        </svg>
    )
}
