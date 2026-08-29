interface BrandLogoProps {
    brand: string
    className?: string
}

export function BrandLogo({ brand, className }: BrandLogoProps) {
    const normalized = brand.toLowerCase()

    switch (normalized) {
        case "visa":
            return <VisaLogo className={className} />
        case "mastercard":
            return <MastercardLogo className={className} />
        case "amex":
        case "american_express":
            return <AmexLogo className={className} />
        case "discover":
            return <DiscoverLogo className={className} />
        default:
            return <GenericLogo className={className} />
    }
}

function VisaLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label="Visa"
        >
            <rect width="24" height="24" fill="#ffffff" />
            <text
                x="11.5"
                y="17"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                fontSize="13"
                fontWeight="900"
                fontStyle="italic"
                fill="#1A1F71"
                textAnchor="middle"
            >
                V
            </text>
        </svg>
    )
}

function MastercardLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label="Mastercard"
        >
            <rect width="24" height="24" fill="#000000" />
            <circle cx="9" cy="12" r="5" fill="#EB001B" />
            <circle cx="15" cy="12" r="5" fill="#F79E1B" />
            <path d="M12 8a5 5 0 0 1 0 8 5 5 0 0 1 0-8z" fill="#FF5F00" />
        </svg>
    )
}

function AmexLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label="American Express"
        >
            <rect width="24" height="24" fill="#006FCF" />
            <text
                x="12"
                y="15.5"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                fontSize="6.5"
                fontWeight="900"
                fill="#ffffff"
                textAnchor="middle"
                letterSpacing="0.3"
            >
                AMEX
            </text>
        </svg>
    )
}

function DiscoverLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label="Discover"
        >
            <rect width="24" height="24" fill="#ffffff" />
            <circle cx="17" cy="12" r="5" fill="#FF6000" />
            <text
                x="9"
                y="14"
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
                fontSize="3.5"
                fontWeight="800"
                fill="#000000"
                textAnchor="middle"
                letterSpacing="-0.1"
            >
                DISCOVER
            </text>
        </svg>
    )
}

function GenericLogo({ className }: { className?: string }) {
    return (
        <svg
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            role="img"
            aria-label="Card"
        >
            <rect width="24" height="24" fill="#E4E4E7" />
            <rect x="4" y="9" width="12" height="1.8" fill="#71717A" />
            <rect x="4" y="12" width="7" height="1.8" fill="#71717A" />
        </svg>
    )
}
