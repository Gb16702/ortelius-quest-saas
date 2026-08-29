import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { type InvitationsQueryData, parseInvitationsResponse } from "../model/invitation.schema"
import type { InvitationsListKeyParams } from "./invitation.query"
import { createInvitationsListSearchParams } from "./invitation-list-request"

export async function fetchInvitationsPageServer(
    orgId: string,
    accessToken: string,
    params: InvitationsListKeyParams
): Promise<InvitationsQueryData> {
    const { page, limit } = params
    const searchParams = createInvitationsListSearchParams(params)

    const response = await fetch(
        `${serverEnv.API_URL}/api/organizations/${orgId}/invitations?${searchParams}`,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    if (!response.ok) {
        throw new Error("Failed to fetch invitations")
    }

    return parseInvitationsResponse(await readJsonResponse(response), { page, limit })
}
