interface BrandingProps {
    className?: string
}

export const Branding = ({ className = "size-4" }: BrandingProps) => {
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
            <title>Branding</title>
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M4 5a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2z" />
            <path d="M9 16l3 -8l3 8" />
            <path d="M10.2 13h3.6" />
        </svg>
    )
}
