import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { type MembersQueryData, parseMembersResponse } from "../model/member.schema"
import type { MembersListKeyParams } from "./member.query"

export async function fetchMembersPageServer(
    orgId: string,
    accessToken: string,
    params: MembersListKeyParams
): Promise<MembersQueryData> {
    const { page, limit, search, role } = params
    const searchParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
    })

    if (search) searchParams.set("search", search)
    if (role && role !== "all" && role !== "" && role !== "undefined") {
        searchParams.set("role", role)
    }

    const response = await fetch(
        `${serverEnv.API_URL}/api/organizations/${orgId}/members?${searchParams}`,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    if (!response.ok) {
        throw new Error("Failed to fetch members")
    }

    return parseMembersResponse(await readJsonResponse(response), { page, limit })
}
