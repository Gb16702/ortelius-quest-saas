import { parseNullableUserRoleResponse, type Role } from "@/entities/access/@x/organization"
import { serverEnv } from "@/shared/config/env.server"

export async function getOrganizationUserRoleServer(
    organizationId: string,
    accessToken: string
): Promise<Role | null> {
    const response = await fetch(
        `${serverEnv.API_URL}/api/organizations/${organizationId}/user/role`,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
        }
    )

    if (!response.ok) {
        return null
    }

    const payload: unknown = await response.json()
    return parseNullableUserRoleResponse(payload)
}
