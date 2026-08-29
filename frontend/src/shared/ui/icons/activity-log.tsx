interface ActivityLogProps {
    className?: string
}

export const ActivityLog = ({ className = "size-4" }: ActivityLogProps) => {
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
            <title>Activity log</title>
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M14 4h-8a2 2 0 0 0 -2 2v13a2 2 0 0 0 2 2h12a2 2 0 0 0 2 -2v-7" />
            <path d="M8 9h6" />
            <path d="M8 13h4" />
            <path d="M8 17h6" />
            <path d="M18 7m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
            <path d="M18 5.5v1.5l1 1" />
        </svg>
    )
}
