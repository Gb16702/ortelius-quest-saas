import {
    type InvitationApiData,
    type InvitationData,
    invitationIdSchema,
    invitationLookupResponseSchema,
} from "@/entities/invitation"
import type { ActiveOrganization, User } from "@/entities/session"
import { type InvitationPageData, InvitationState } from "@/features/members"
import { readJsonResponse } from "@/shared/api/http.response"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

export type TanstackInvitationLoaderResult =
    | InvitationPageData
    | {
          redirectTo: string
      }

interface LoadTanstackInvitationDataArgs {
    activeOrganization: ActiveOrganization | null
    invitationId: string | null
    user: User | null
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

export async function loadTanstackInvitationData({
    activeOrganization,
    invitationId,
    user,
}: LoadTanstackInvitationDataArgs): Promise<TanstackInvitationLoaderResult> {
    const invitationIdResult = safeParseSchema(invitationIdSchema, invitationId)
    if (!invitationIdResult.success) {
        return buildInvalidInvitationData("Invalid invitation link")
    }

    const parsedInvitationId = invitationIdResult.data

    try {
        const response = await fetch(
            `/api/organizations/invitation/${encodeURIComponent(parsedInvitationId)}`,
            {
                credentials: "include",
                headers: {
                    Accept: "application/json",
                },
            }
        )

        const payload = await readJsonResponse(response)
        const result = safeParseSchema(invitationLookupResponseSchema, payload)

        if (!response.ok || !result.success || !result.data.success || !result.data.data) {
            return {
                invitation: null,
                invitationId: parsedInvitationId,
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
                invitationId: parsedInvitationId,
                state: InvitationState.EXPIRED,
            }
        }

        if (invitation.status === "accepted") {
            if (user && user.email === invitation.email) {
                return {
                    redirectTo: activeOrganization?.slug
                        ? `/org/${activeOrganization.slug}/dashboard`
                        : "/me/requests",
                }
            }

            return {
                invitation: null,
                invitationId: parsedInvitationId,
                error: "This invitation has already been accepted.",
                state: InvitationState.INVALID,
            }
        }

        if (!user) {
            return {
                invitation: buildInvitationData(invitation, isExpired),
                invitationId: parsedInvitationId,
                state: InvitationState.UNAUTHENTICATED,
            }
        }

        if (user.email !== invitation.email) {
            return {
                invitation: null,
                invitationId: parsedInvitationId,
                error: "You are not authorized to view this invitation.",
                state: InvitationState.INVALID,
            }
        }

        return {
            invitation: buildInvitationData(invitation, isExpired),
            invitationId: parsedInvitationId,
            state: InvitationState.VALID,
        }
    } catch (error: unknown) {
        return {
            invitation: null,
            invitationId: parsedInvitationId,
            error: error instanceof Error ? error.message : "Failed to load invitation",
            state: InvitationState.INVALID,
        }
    }
}
