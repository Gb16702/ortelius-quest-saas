import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createApiError, readJsonResponse } from "@/shared/api/http.response"
import { DEFAULT_PAGE_SIZE } from "@/shared/lib/url.state"
import {
    type MembersQueryData,
    type OrganizationMember,
    parseMemberProfileResponse,
    parseMembersResponse,
} from "../model/member.schema"

export interface MembersListKeyParams {
    page: number
    limit: number
    search: string
    role: string
}

export const membersKeys = {
    all: ["members"] as const,
    lists: (organizationId: string) => [...membersKeys.all, organizationId] as const,
    list: (organizationId: string, params: MembersListKeyParams) =>
        [
            ...membersKeys.lists(organizationId),
            {
                page: params.page,
                limit: params.limit,
                search: params.search,
                role: params.role,
            },
        ] as const,
    directory: (organizationId: string) => ["organization-members", organizationId] as const,
    profiles: () => ["member-profile"] as const,
    profile: (organizationId: string, userId: string) =>
        [...membersKeys.profiles(), organizationId, userId] as const,
    activities: () => ["member-activity"] as const,
    activity: (organizationSlug: string | null, userId: string | null, limit: number) =>
        [...membersKeys.activities(), organizationSlug, userId, limit] as const,
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000
const DEFAULT_CACHE_TIME = 10 * 60 * 1000

export function createDefaultMembersListKeyParams(): MembersListKeyParams {
    return {
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        search: "",
        role: "",
    }
}

export async function fetchMembersPage(
    orgId: string,
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

    const res = await fetch(`/api/organizations/${orgId}/members?${searchParams}`, {
        credentials: "include",
    })

    const json = await readJsonResponse(res)
    if (!res.ok) throw createApiError(res.status, json, "Failed to fetch members")

    return parseMembersResponse(json, { page, limit })
}

export function membersPageQueryOptions(orgId: string, params: MembersListKeyParams) {
    return {
        queryKey: membersKeys.list(orgId, params),
        queryFn: () => fetchMembersPage(orgId, params),
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_CACHE_TIME,
    }
}

interface UseMembersOptions {
    enabled?: boolean
    initialData?: MembersQueryData
}

export function useMembers(
    orgId: string,
    params: {
        page: number
        limit: number
        search: string
        role: string
    },
    options?: UseMembersOptions
) {
    const { page, limit, search, role } = params

    return useQuery<MembersQueryData>({
        ...membersPageQueryOptions(orgId, { page, limit, search, role }),
        placeholderData: keepPreviousData,
        enabled: !!orgId && (options?.enabled ?? true),
        refetchOnWindowFocus: false,
        ...(options?.initialData !== undefined ? { initialData: options.initialData } : {}),
    })
}

export function organizationMembersQueryOptions(orgId: string) {
    return {
        queryKey: membersKeys.directory(orgId),
        queryFn: async () => {
            const params = new URLSearchParams({
                page: "1",
                limit: "100",
            })

            const res = await fetch(`/api/organizations/${orgId}/members?${params}`, {
                credentials: "include",
            })

            const json = await readJsonResponse(res)
            if (!res.ok) {
                throw createApiError(res.status, json, "Failed to fetch organization members")
            }

            return parseMembersResponse(json, { page: 1, limit: 100 }).members
        },
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_CACHE_TIME,
        refetchOnWindowFocus: false,
    }
}

export function useOrganizationMembers(orgId: string, options?: { enabled?: boolean }) {
    return useQuery<OrganizationMember[]>({
        ...organizationMembersQueryOptions(orgId),
        enabled: !!orgId && (options?.enabled ?? true),
    })
}

export function useMemberProfile(
    userId: string,
    organizationId: string,
    options?: { enabled?: boolean }
) {
    return useQuery({
        queryKey: membersKeys.profile(organizationId, userId),
        queryFn: async () => {
            const res = await fetch(`/api/members/${encodeURIComponent(userId)}/profile`, {
                credentials: "include",
            })

            const json = await readJsonResponse(res)
            if (!res.ok) {
                throw createApiError(res.status, json, "Failed to fetch member profile")
            }

            return parseMemberProfileResponse(json)
        },
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_CACHE_TIME,
        enabled: !!organizationId && !!userId && (options?.enabled ?? true),
        refetchOnWindowFocus: false,
    })
}
