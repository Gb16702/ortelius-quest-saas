import type { QueryClient } from "@tanstack/react-query"
import type { ActiveOrganization, SessionResponse, User } from "@/entities/session"
import type { publicEnv } from "@/shared/config/env"

export interface TanstackRouterContext {
    queryClient: QueryClient
    sessionData: SessionResponse | null
    user: User | null
    activeOrganization: ActiveOrganization | null
    publicEnv: typeof publicEnv
    requestOrigin: string | null
}
