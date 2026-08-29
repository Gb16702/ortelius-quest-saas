import { FILTER_STATES } from "./member-url.state"

interface RoleOption {
    value: string
}

interface MemberPaginationInput {
    total: number
    page: number
    limit: number
    totalPages: number
}

export interface MemberListPagination {
    total: number
    currentPage: number
    limit: number
    totalPages: number
}

export function createMemberListPagination(
    pagination: MemberPaginationInput
): MemberListPagination {
    return {
        total: pagination.total,
        currentPage: pagination.page,
        limit: pagination.limit,
        totalPages: pagination.totalPages,
    }
}

export function getSelectedRoleValues(
    role: string | null | undefined,
    roleOptions: readonly RoleOption[]
): string[] {
    if (!role || role === FILTER_STATES.ROLES.DEFAULT) {
        return roleOptions.map((option) => option.value)
    }

    if (role === FILTER_STATES.ROLES.EMPTY) return []

    return role.split(",")
}

export function getSelectedStatusValues({
    status,
    defaultStatus,
    defaultValues,
}: {
    status: string | null | undefined
    defaultStatus: string
    defaultValues: readonly string[]
}): string[] {
    if (!status || status === defaultStatus) return [...defaultValues]
    if (status === FILTER_STATES.MEMBER_STATUS.EMPTY) return []
    return status.split(",")
}

export function createMultiSelectFilterValue({
    values,
    emptyValue,
}: {
    values: readonly string[]
    emptyValue: string
}): string {
    return values.length === 0 ? emptyValue : values.join(",")
}
