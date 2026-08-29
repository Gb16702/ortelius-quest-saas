import type { TanstackRouterContext } from "@/app/model/router.context"
import type { ActiveOrganization, SessionResponse, User } from "@/entities/session"
import { readMeShellBootstrapSession } from "./private-shell-bootstrap"

export interface MeRouteSession {
    sessionData: SessionResponse | null
    user: User | null
    activeOrganization: ActiveOrganization | null
}

export interface AuthenticatedMeRouteSession {
    sessionData: SessionResponse
    user: User
    activeOrganization: ActiveOrganization | null
}

export async function resolveMeRouteSession(
    context: TanstackRouterContext
): Promise<MeRouteSession> {
    if (context.sessionData?.user) {
        return {
            sessionData: context.sessionData,
            user: context.user ?? context.sessionData.user,
            activeOrganization: context.activeOrganization,
        }
    }

    return readMeShellBootstrapSession(context)
}

export function isAuthenticatedMeRouteSession(
    session: MeRouteSession
): session is AuthenticatedMeRouteSession {
    return Boolean(session.sessionData?.user && session.user)
}
