import { createServerFn } from "@tanstack/react-start"
import * as v from "valibot"

export const organizationShowcaseInputSchema = v.object({
    slug: v.pipe(v.string(), v.trim(), v.minLength(1)),
})

export const loadOrganizationShowcase = createServerFn({ method: "GET" })
    .inputValidator(organizationShowcaseInputSchema)
    .handler(async ({ data }) => {
        const { isAdminOrOwner } = await import("@/entities/access")
        const { fetchOrganizationShowcaseServer, getOrganizationUserRoleServer } = await import(
            "@/entities/organization/index.server"
        )
        const { getAuthSession } = await import("@/features/auth/index.server")
        const { serverEnv } = await import("@/shared/config/env.server")
        const { getRequest } = await import("@tanstack/react-start/server")

        const request = getRequest()
        const showcaseData = await fetchOrganizationShowcaseServer(data.slug)
        if (!showcaseData) return null

        const session = await getAuthSession(request)
        const role = session.accessToken
            ? await getShowcaseUserRole(showcaseData.organization.id, session.accessToken)
            : null

        return {
            showcaseData,
            isUserMember: Boolean(role),
            isAdmin: role ? isAdminOrOwner(role) : false,
            slug: data.slug,
            loginUrl: serverEnv.LOGIN_URL,
        }

        async function getShowcaseUserRole(organizationId: string, accessToken: string) {
            try {
                return await getOrganizationUserRoleServer(organizationId, accessToken)
            } catch {
                return null
            }
        }
    })
