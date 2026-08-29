import { usePublicAuthHint } from "@/features/auth"
import type { LegalHeaderSessionState } from "./legal-header-session"

export function useLegalHeaderSession(): LegalHeaderSessionState {
    return usePublicAuthHint()
}
