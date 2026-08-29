import { Badge } from "@/shared/ui/badge"

interface QuoteStatusBadgeProps {
    status: string
}

export function QuoteStatusBadge({ status }: QuoteStatusBadgeProps) {
    switch (status) {
        case "sent":
            return (
                <Badge variant="attention" size="sm">
                    Pending Response
                </Badge>
            )
        case "rejected":
            return (
                <Badge variant="danger" size="sm">
                    Rejected
                </Badge>
            )
        default:
            return null
    }
}
