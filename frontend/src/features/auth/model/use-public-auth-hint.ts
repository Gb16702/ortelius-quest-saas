import { useEffect, useState } from "react"
import { activeOrganizationResponseSchema, type User, userSchema } from "@/entities/session"
import { readJsonResponse } from "@/shared/api/http.response"
import { clearClientLoggedInHint, setClientLoggedInHint } from "@/shared/lib/auth/client-logout"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

export interface PublicAuthHintUser {
    id: string
    email: string
    name: string
    image: string | null
}

export interface PublicAuthHintSession {
    user: PublicAuthHintUser
}

export interface PublicAuthHintState {
    session: PublicAuthHintSession | null
    activeOrgSlug: string | null
}

const emptyPublicAuthHintState: PublicAuthHintState = {
    session: null,
    activeOrgSlug: null,
}

async function readOptionalJson(path: string): Promise<unknown | null> {
    const response = await fetch(path, {
        credentials: "same-origin",
        headers: {
            Accept: "application/json",
        },
    })

    if (!response.ok) return null
    return readJsonResponse(response)
}

function createSessionFromUser(user: User): PublicAuthHintSession {
    return {
        user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image ?? null,
        },
    }
}

export function usePublicAuthHint(): PublicAuthHintState {
    const [state, setState] = useState<PublicAuthHintState>(emptyPublicAuthHintState)

    useEffect(() => {
        let isActive = true

        async function loadAuthHint() {
            try {
                const userPayload = await readOptionalJson("/api/auth/profile")
                const userResult = safeParseSchema(userSchema, userPayload)

                if (!userResult.success) {
                    clearClientLoggedInHint()
                    if (isActive) setState(emptyPublicAuthHintState)
                    return
                }

                const organizationPayload = await readOptionalJson("/api/onboarding/status")
                const organizationResult = safeParseSchema(
                    activeOrganizationResponseSchema,
                    organizationPayload
                )

                if (!isActive) return

                setState({
                    session: createSessionFromUser(userResult.data),
                    activeOrgSlug: organizationResult.success
                        ? (organizationResult.data.organization?.slug ?? null)
                        : null,
                })
                setClientLoggedInHint()
            } catch {
                clearClientLoggedInHint()
                if (isActive) setState(emptyPublicAuthHintState)
            }
        }

        void loadAuthHint()

        return () => {
            isActive = false
        }
    }, [])

    return state
}
