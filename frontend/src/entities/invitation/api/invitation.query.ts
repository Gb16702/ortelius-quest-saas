import { keepPreviousData, useQuery } from "@tanstack/react-query"
import { createApiError, readJsonResponse } from "@/shared/api/http.response"
import { DEFAULT_PAGE_SIZE } from "@/shared/lib/url.state"
import { type InvitationsQueryData, parseInvitationsResponse } from "../model/invitation.schema"
import { createInvitationsListSearchParams } from "./invitation-list-request"

export interface InvitationsListKeyParams {
    page: number
    limit: number
    search: string
    role: string
    status: string
}

export const invitationsKeys = {
    all: ["invitations"] as const,
    lists: (organizationId: string) => [...invitationsKeys.all, organizationId] as const,
    list: (organizationId: string, params: InvitationsListKeyParams) =>
        [
            ...invitationsKeys.lists(organizationId),
            {
                page: params.page,
                limit: params.limit,
                search: params.search,
                role: params.role,
                status: params.status,
            },
        ] as const,
}

const DEFAULT_STALE_TIME = 5 * 60 * 1000
const DEFAULT_CACHE_TIME = 10 * 60 * 1000

export function createDefaultInvitationsListKeyParams(): InvitationsListKeyParams {
    return {
        page: 1,
        limit: DEFAULT_PAGE_SIZE,
        search: "",
        role: "",
        status: "",
    }
}

export async function fetchInvitationsPage(
    orgId: string,
    params: InvitationsListKeyParams
): Promise<InvitationsQueryData> {
    const { page, limit } = params
    const searchParams = createInvitationsListSearchParams(params)

    const res = await fetch(`/api/organizations/${orgId}/invitations?${searchParams}`, {
        credentials: "include",
    })

    const json = await readJsonResponse(res)
    if (!res.ok) {
        throw createApiError(res.status, json, "Failed to fetch invitations")
    }

    return parseInvitationsResponse(json, { page, limit })
}

export function invitationsPageQueryOptions(orgId: string, params: InvitationsListKeyParams) {
    return {
        queryKey: invitationsKeys.list(orgId, params),
        queryFn: () => fetchInvitationsPage(orgId, params),
        staleTime: DEFAULT_STALE_TIME,
        gcTime: DEFAULT_CACHE_TIME,
    }
}

interface UseInvitationsOptions {
    enabled?: boolean
    initialData?: InvitationsQueryData
}

export function useInvitations(
    orgId: string,
    params: {
        page: number
        limit: number
        search: string
        role: string
        status: string
    },
    options?: UseInvitationsOptions
) {
    const { page, limit, search, role, status } = params

    return useQuery<InvitationsQueryData>({
        ...invitationsPageQueryOptions(orgId, { page, limit, search, role, status }),
        placeholderData: keepPreviousData,
        enabled: !!orgId && (options?.enabled ?? true),
        refetchOnWindowFocus: false,
        ...(options?.initialData !== undefined ? { initialData: options.initialData } : {}),
    })
}
