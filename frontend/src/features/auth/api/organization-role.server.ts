import { isAdminOrOwner } from "@/entities/access"
import { readJsonResponse } from "@/shared/api/http.response"
import { serverEnv } from "@/shared/config/env.server"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { organizationRoleResponseSchema } from "../model/schemas/organization-role.schema"

function createRedirectResponse(location: string): Response {
    return new Response(null, {
        status: 302,
        headers: { Location: location },
    })
}

export async function verifyOrgAdminRole(
    organizationId: string,
    accessToken: string
): Promise<void> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5_000)

    try {
        const res = await fetch(
            `${serverEnv.API_URL}/api/organizations/${organizationId}/user/role`,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                signal: controller.signal,
            }
        )

        if (!res.ok) {
            throw createRedirectResponse("/me/requests")
        }

        const roleResponse = parseSchema(
            organizationRoleResponseSchema,
            await readJsonResponse(res)
        )

        if (!isAdminOrOwner(roleResponse.data.role)) {
            throw createRedirectResponse("/me/requests")
        }
    } catch (error) {
        if (error instanceof Response) throw error
        throw createRedirectResponse("/me/requests")
    } finally {
        clearTimeout(timeout)
    }
}
