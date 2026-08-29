import { createContext, type ReactNode, use } from "react"
import type { PublicAuthHintSession } from "@/features/auth"
import type { SupportedLanguage } from "@/shared/lib/i18n/marketing"

export interface MarketingSessionValue {
    lang: SupportedLanguage
    session: PublicAuthHintSession | null
    activeOrgSlug: string | null
}

const MarketingSessionContext = createContext<MarketingSessionValue | null>(null)

interface MarketingSessionProviderProps {
    children: ReactNode
    value: MarketingSessionValue
}

export function MarketingSessionProvider({ children, value }: MarketingSessionProviderProps) {
    return <MarketingSessionContext value={value}>{children}</MarketingSessionContext>
}

export function useMarketingSession(): MarketingSessionValue {
    const value = use(MarketingSessionContext)
    if (!value) {
        throw new Error("useMarketingSession must be used within MarketingSessionProvider.")
    }
    return value
}
