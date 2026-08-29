import { acceptInvitationResponseSchema, invitationIdSchema } from "@/entities/invitation"
import { getResponseErrorMessage, readJsonResponse } from "@/shared/api/http.response"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"

interface InvitationAcceptedResult {
    status: "accepted"
    redirectTo: string
}

interface InvitationInvalidResult {
    status: "invalid"
    message: string
    errorKey: string
}

interface InvitationErrorResult {
    status: "error"
    message: string
    errorKey: string
}

export type InvitationAcceptResult =
    | InvitationAcceptedResult
    | InvitationInvalidResult
    | InvitationErrorResult

export async function acceptInvitationById(
    invitationId: string | null
): Promise<InvitationAcceptResult> {
    const invitationIdResult = safeParseSchema(invitationIdSchema, invitationId)
    if (!invitationIdResult.success) {
        return {
            status: "invalid",
            message: "Invalid invitation link",
            errorKey: "invitation:error.invalidLink",
        }
    }

    try {
        const res = await fetch(
            `/api/invitations/invitation/${encodeURIComponent(invitationIdResult.data)}/accept`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            }
        )

        const payload = await readJsonResponse(res)

        if (!res.ok) {
            return {
                status: "error",
                message: getResponseErrorMessage(payload, "Failed to accept invitation"),
                errorKey: "invitation:error.acceptFailed",
            }
        }

        const result = safeParseSchema(acceptInvitationResponseSchema, payload)

        if (!result.success) {
            return {
                status: "error",
                message: "Failed to accept invitation",
                errorKey: "invitation:error.acceptFailed",
            }
        }

        const slug = result.data.data?.organization?.slug
        return {
            status: "accepted",
            redirectTo: slug ? `/org/${slug}/dashboard?joined=true` : "/me/requests?joined=true",
        }
    } catch (error: unknown) {
        return {
            status: "error",
            message: error instanceof Error ? error.message : "An unexpected error occurred",
            errorKey: "invitation:error.unexpected",
        }
    }
}
