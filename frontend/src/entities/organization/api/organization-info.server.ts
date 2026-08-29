import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import {
    type OrganizationInfo,
    parseOrganizationInfoResponse,
} from "../model/organization-info.schema"

export async function fetchOrganizationInfoServer(
    organizationId: string,
    accessToken: string
): Promise<OrganizationInfo> {
    const response = await fetch(`${serverEnv.API_URL}/api/organizations/${organizationId}/info`, {
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
    })

    if (!response.ok) {
        throw new Error("Failed to fetch organization info")
    }

    return parseOrganizationInfoResponse(organizationId, await readJsonResponse(response))
}
