import {
    emailExistsResponseSchema,
    type InvitationApiData,
    type InvitationData,
    invitationIdSchema,
    invitationLookupResponseSchema,
} from "@/entities/invitation"
import type { User } from "@/entities/session"
import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { logError } from "@/shared/lib/error"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { type InvitationPageData, InvitationState } from "../model/invitation.state"

interface LoadInvitationDataArgs {
    params: { id?: string }
    request: Request
    getCurrentAuthSession: () => Promise<{ user: User | null; accessToken: string | null }>
    resolveAcceptedInvitationRedirect: (accessToken: string) => Promise<string>
}

interface InvitationRedirectData {
    redirectTo: string
}

export type InvitationLoaderResult = InvitationPageData | InvitationRedirectData

async function checkEmailExistsInCognito(email: string): Promise<boolean | null> {
    try {
        const res = await fetch(`${serverEnv.AUTH_URL}/auth/check-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
        })
        if (!res.ok) return null
        const data = safeParseSchema(emailExistsResponseSchema, await readJsonResponse(res))
        return data.success ? (data.data.exists ?? null) : null
    } catch (error) {
        logError("Failed to check email in Cognito", error)
        return null
    }
}

function buildInvitationData(invitation: InvitationApiData, isExpired: boolean): InvitationData {
    return {
        ...invitation,
        isExpired,
    }
}

function buildInvalidInvitationData(error: string): InvitationPageData {
    return {
        invitation: null,
        invitationId: null,
        error,
        state: InvitationState.INVALID,
    }
}

export async function loadInvitationData({
    params,
    request,
    getCurrentAuthSession,
    resolveAcceptedInvitationRedirect,
}: LoadInvitationDataArgs): Promise<InvitationLoaderResult> {
    const { id } = params

    if (!id) {
        throw new Response("Invitation ID is required", { status: 400 })
    }

    const parsed = safeParseSchema(invitationIdSchema, id)
    if (!parsed.success) {
        return buildInvalidInvitationData("Invalid invitation link")
    }

    const invitationId = parsed.data

    try {
        const res = await fetch(
            `${serverEnv.API_URL}/api/organizations/invitation/${encodeURIComponent(invitationId)}`,
            {
                headers: {
                    "Content-Type": "application/json",
                    Cookie: request.headers.get("Cookie") || "",
                },
            }
        )

        const result = safeParseSchema(invitationLookupResponseSchema, await readJsonResponse(res))

        if (!res.ok || !result.success || !result.data.success || !result.data.data) {
            return {
                invitation: null,
                invitationId,
                error: result.success
                    ? result.data.message || "Invitation not found"
                    : "Invitation not found",
                state: InvitationState.INVALID,
            }
        }

        const invitation = result.data.data
        const isExpired = new Date(invitation.expiresAt) < new Date()

        if (isExpired) {
            return {
                invitation: buildInvitationData(invitation, true),
                invitationId,
                state: InvitationState.EXPIRED,
            }
        }

        const { user: currentUser, accessToken } = await getCurrentAuthSession()

        if (invitation.status === "accepted") {
            if (currentUser && currentUser.email === invitation.email && accessToken) {
                return {
                    redirectTo: await resolveAcceptedInvitationRedirect(accessToken),
                }
            }

            return {
                invitation: null,
                invitationId,
                error: "This invitation has already been accepted.",
                state: InvitationState.INVALID,
            }
        }

        if (!currentUser) {
            const cognitoExists = await checkEmailExistsInCognito(invitation.email)
            return {
                invitation: buildInvitationData(
                    {
                        ...invitation,
                        userExists: cognitoExists ?? invitation.userExists,
                    },
                    isExpired
                ),
                invitationId,
                state: InvitationState.UNAUTHENTICATED,
            }
        }

        if (currentUser.email !== invitation.email) {
            return {
                invitation: null,
                invitationId,
                error: "You are not authorized to view this invitation.",
                state: InvitationState.INVALID,
            }
        }

        return {
            invitation: buildInvitationData(invitation, isExpired),
            invitationId,
            state: InvitationState.VALID,
        }
    } catch (error) {
        if (error instanceof Response) {
            throw error
        }

        logError("Failed to load invitation", error)
        return {
            invitation: null,
            invitationId,
            error: error instanceof Error ? error.message : "Failed to load invitation",
            state: InvitationState.INVALID,
        }
    }
}
