import type { SessionResponse } from "@/entities/session"
import { ChatsPageContent, ChatsPageProvider } from "@/features/chat"

interface MeChatsPageProps {
    sessionData: SessionResponse | null
    hrefBasePath?: string
    onNavigate?: (href: string) => void
}

export function MeChatsPage({ sessionData, hrefBasePath, onNavigate }: MeChatsPageProps) {
    return (
        <ChatsPageProvider
            sessionData={sessionData}
            basePath="/me"
            hrefBasePath={hrefBasePath}
            onNavigate={onNavigate}
        >
            <ChatsPageContent />
        </ChatsPageProvider>
    )
}
