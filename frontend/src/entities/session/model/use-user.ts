import { useMatches } from "@tanstack/react-router"
import type { SessionResponse, User } from "./session"

interface SessionMatchContext {
    user?: User | null
    sessionData?: SessionResponse | null
}

export const useUser = (): User | null => {
    return useMatches({
        select: (matches) => {
            for (let index = matches.length - 1; index >= 0; index -= 1) {
                const context = matches[index].context as SessionMatchContext
                const user = context.user ?? context.sessionData?.user ?? null

                if (user) {
                    return user
                }
            }

            return null
        },
    })
}
