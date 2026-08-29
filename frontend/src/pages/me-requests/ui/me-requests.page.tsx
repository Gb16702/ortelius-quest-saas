import type { SessionResponse } from "@/entities/session"
import { RequestsPageContent, RequestsPageProvider } from "@/features/requests"

interface MeRequestsPageProps {
    sessionData: SessionResponse | null
    onNavigate?: (href: string) => void
}

export function MeRequestsPage({ sessionData, onNavigate }: MeRequestsPageProps) {
    return (
        <RequestsPageProvider
            sessionData={sessionData}
            scope="personal"
            basePath="/me"
            onNavigate={onNavigate}
        >
            <RequestsPageContent />
        </RequestsPageProvider>
    )
}
