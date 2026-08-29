import { queryOptions, useQuery } from "@tanstack/react-query"
import { getResponseErrorMessage, readJsonResponse } from "@/shared/api/http.response"
import type { Role } from "../model/access.permissions"
import { parseUserRoleResponse } from "../model/user-role.schema"

export interface CurrentUserRoleQueryScope {
    organizationId: string | null | undefined
    userId: string | null | undefined
}

export async function fetchUserRole(organizationId: string): Promise<Role> {
    const response = await fetch(`/api/organizations/${organizationId}/user/role`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
        },
    })

    const data = await readJsonResponse(response)
    if (!response.ok) {
        throw new Error(getResponseErrorMessage(data, "Failed to fetch user role"))
    }

    return parseUserRoleResponse(data)
}

export const userRoleKeys = {
    all: ["user-role"] as const,
    detail: (organizationId: string | null | undefined) =>
        [...userRoleKeys.all, organizationId ?? null] as const,
    current: ({ organizationId, userId }: CurrentUserRoleQueryScope) =>
        [
            ...userRoleKeys.all,
            "current",
            { organizationId: organizationId ?? null, userId: userId ?? null },
        ] as const,
}

export function currentUserRoleQueryOptions(scope: CurrentUserRoleQueryScope) {
    return queryOptions({
        queryKey: userRoleKeys.current(scope),
        queryFn: () => {
            if (!scope.organizationId) throw new Error("organizationId is required")
            if (!scope.userId) throw new Error("userId is required")
            return fetchUserRole(scope.organizationId)
        },
        staleTime: 30 * 1000,
    })
}

export function useUserRole(
    organizationId: string | null,
    options?: { initialData?: Role | null }
) {
    return useQuery({
        queryKey: userRoleKeys.detail(organizationId),
        queryFn: () => {
            if (!organizationId) throw new Error("organizationId is required")
            return fetchUserRole(organizationId)
        },
        enabled: !!organizationId,
        staleTime: 30 * 1000,
        ...(options?.initialData ? { initialData: options.initialData } : {}),
    })
}

export function useCurrentUserOrganizationRole(
    scope: CurrentUserRoleQueryScope,
    options?: { initialData?: Role | null }
) {
    return useQuery({
        ...currentUserRoleQueryOptions(scope),
        enabled: !!scope.organizationId && !!scope.userId,
        ...(options?.initialData ? { initialData: options.initialData } : {}),
    })
}
