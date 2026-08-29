import { useCallback, useMemo } from "react"
import {
    createMultiSelectFilterValue,
    getSelectedRoleValues,
    getSelectedStatusValues,
} from "../../lib/member-list-filters"
import { FILTER_STATES } from "../../lib/member-url.state"

interface RoleOption {
    value: string
}

interface UseMemberListFiltersOptions {
    role: string | null | undefined
    status: string | null | undefined
    roleOptions: readonly RoleOption[]
    defaultStatus: string
    defaultStatusValues: readonly string[]
    updateRoles: (role: string) => void
    updateStatus: (status: string) => void
}

export function useMemberListFilters({
    role,
    status,
    roleOptions,
    defaultStatus,
    defaultStatusValues,
    updateRoles,
    updateStatus,
}: UseMemberListFiltersOptions) {
    const selectedRoles = useMemo(
        () => getSelectedRoleValues(role, roleOptions),
        [role, roleOptions]
    )

    const selectedStatuses = useMemo(
        () =>
            getSelectedStatusValues({
                status,
                defaultStatus,
                defaultValues: defaultStatusValues,
            }),
        [status, defaultStatus, defaultStatusValues]
    )

    const updateRoleFilter = useCallback(
        (values: string[]) => {
            updateRoles(
                createMultiSelectFilterValue({
                    values,
                    emptyValue: FILTER_STATES.ROLES.EMPTY,
                })
            )
        },
        [updateRoles]
    )

    const updateStatusFilter = useCallback(
        (values: string[]) => {
            updateStatus(
                createMultiSelectFilterValue({
                    values,
                    emptyValue: FILTER_STATES.MEMBER_STATUS.EMPTY,
                })
            )
        },
        [updateStatus]
    )

    return {
        selectedRoles,
        selectedStatuses,
        updateRoleFilter,
        updateStatusFilter,
    }
}
