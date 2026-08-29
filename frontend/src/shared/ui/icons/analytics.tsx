interface AnalyticsProps {
    className?: string
}

export const Analytics = ({ className = "size-4" }: AnalyticsProps) => {
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
            <title>Analytics</title>
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 19l16 0" />
            <path d="M4 15l4 -6l4 2l4 -5l4 4" />
        </svg>
    )
}
