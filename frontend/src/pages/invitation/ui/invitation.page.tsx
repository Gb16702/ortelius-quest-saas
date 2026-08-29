import { InvitationPageContent, type InvitationRouteData } from "@/features/members"

interface InvitationPageProps {
    loaderData: InvitationRouteData
    onNavigate?: (href: string) => void
}

export function InvitationPage({ loaderData, onNavigate }: InvitationPageProps) {
    return <InvitationPageContent loaderData={loaderData} onNavigate={onNavigate} />
}
