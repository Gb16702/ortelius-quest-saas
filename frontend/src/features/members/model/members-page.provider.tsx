import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useMemo,
    useReducer,
} from "react"
import { useTranslation } from "react-i18next"
import {
    type AssignableRole,
    ROLE_OPTIONS,
    ROLE_OPTIONS_WITH_OWNER,
    useUserRole,
} from "@/entities/access"
import type { InviteForm } from "@/entities/invitation"
import { membersKeys, type OrganizationMember, useMembers } from "@/entities/member"
import { useOrg } from "@/entities/organization"
import type { SessionResponse as SessionData } from "@/entities/session"
import {
    getQueryPrimaryDataSource,
    type PrimaryDataSource,
} from "@/shared/lib/performance/navigation-metrics"
import { usePrimaryDataVisibleMetric } from "@/shared/lib/performance/use-primary-data-visible-metric"
import type { MultiSelectOption } from "@/shared/ui/multi-select"
import { showRetryErrorToast } from "@/shared/ui/toasts"
import { createMemberListPagination } from "../lib/member-list-filters"
import { FILTER_STATES, getRoleFilterApiParam } from "../lib/member-url.state"
import { useMemberActions } from "./hooks/use-member-actions"
import { useMemberListFilters } from "./hooks/use-member-list-filters"
import { useMemberProfileDialog } from "./hooks/use-member-profile-dialog"
import { useMembersExport } from "./hooks/use-members-export"
import { useMembersMutationActions } from "./hooks/use-members-mutation-actions"
import { useMembersSearch } from "./hooks/use-members-search"
import {
    getEditingMemberId,
    getRemovingMemberId,
    initialMemberDialogState,
    type MemberDialogState,
    memberDialogReducer,
} from "./member-dialog.state"

const MEMBER_STATUS_VALUES = ["accepted", "pending", "canceled"] as const

const MEMBER_STATUS_OPTIONS: MultiSelectOption[] = [
    { value: "accepted", label: "Accepted", color: "bg-ds-teal-600" },
    { value: "pending", label: "Pending", color: "bg-ds-amber-600" },
    { value: "canceled", label: "Canceled", color: "bg-ds-danger-solid" },
]

interface MembersPageState {
    members: OrganizationMember[]
    isLoading: boolean
    isPlaceholderData: boolean
    isFetching: boolean
    pagination: {
        total: number
        currentPage: number
        limit: number
        totalPages: number
    }
    searchValue: string
    selectedRoles: string[]
    selectedStatuses: string[]
    roleOptions: MultiSelectOption[]
    statusOptions: MultiSelectOption[]
    hasActiveFilters: boolean
    currentUserId: string
    currentUserRole: string
    isExporting: boolean
    dialog: MemberDialogState
    selectedMember: OrganizationMember | null
    removingMember: OrganizationMember | null
    isUpdatingRole: boolean
    isRemovingMember: boolean
    isInviting: boolean
    availableRoles: { value: AssignableRole; label: string }[]
    canInviteMembers: boolean
    isStartingMemberDm: boolean
}

interface MembersPageActions {
    updateSearch: (search: string) => void
    updateRoleFilter: (roles: string[]) => void
    updateStatusFilter: (statuses: string[]) => void
    updatePage: (page: number) => void
    updatePageSize: (size: number) => void
    clearFilters: () => void
    openEditDialog: (memberId: string) => void
    openRemoveDialog: (memberId: string) => void
    openInviteDialog: () => void
    openProfileDialog: (userId: string) => void
    closeDialog: () => void
    updateDialogRole: (role: string) => void
    confirmEditRole: () => void
    confirmRemoveMember: () => void
    sendInvitations: (forms: InviteForm[]) => void
    exportMembers: () => Promise<void>
    editRole: (member: OrganizationMember) => void
    removeMember: (member: OrganizationMember) => void
    canPerformAction: (memberRole: string, memberId: string) => boolean
    onRowClick: (member: OrganizationMember) => void
    startMemberDm?: (member: OrganizationMember) => void
}

interface MembersPageMeta {
    organizationId: string
    organizationSlug: string
    currentUserId: string
    currentUserRole: string
    invitationsHref: string
}

interface MembersPageContextValue {
    state: MembersPageState
    actions: MembersPageActions
    meta: MembersPageMeta
}

const MembersPageContext = createContext<MembersPageContextValue | null>(null)

export function useMembersPage(): MembersPageContextValue {
    const ctx = use(MembersPageContext)
    if (!ctx) {
        throw new Error("useMembersPage must be used within MembersPageProvider")
    }
    return ctx
}

export function useMembersPageOptional(): MembersPageContextValue | null {
    return use(MembersPageContext)
}

interface MembersPageProviderProps {
    sessionData: SessionData
    isStartingMemberDm?: boolean
    onStartMemberDm?: (member: OrganizationMember) => void
    children: ReactNode
}

export function MembersPageProvider({
    sessionData,
    isStartingMemberDm = false,
    onStartMemberDm,
    children,
}: MembersPageProviderProps) {
    const { t } = useTranslation("team")
    const activeOrganizationId = sessionData.session?.activeOrganizationId ?? ""
    const currentUserId = sessionData.user?.id ?? ""
    const { meta, state: orgState } = useOrg()
    const { data: currentUserRole = orgState.role } = useUserRole(activeOrganizationId, {
        initialData: orgState.role,
    })
    const slug = meta.slug
    const invitationsHref = `/org/${slug}/team/invitations`

    const {
        search,
        role,
        status,
        page,
        limit,
        isLoading: isSearchLoading,
        hasActiveFilters,
        updateSearch,
        updateRoles,
        updateStatus,
        updatePage,
        updatePageSize,
        clearFilters,
    } = useMembersSearch()

    const [dialog, dispatch] = useReducer(memberDialogReducer, initialMemberDialogState)
    const { openProfile } = useMemberProfileDialog()

    const membersQuery = useMembers(
        activeOrganizationId,
        {
            page,
            limit,
            search,
            role: getRoleFilterApiParam(role),
        },
        { enabled: true }
    )
    const membersQueryKey = useMemo(
        () =>
            membersKeys.list(activeOrganizationId, {
                page,
                limit,
                search,
                role: getRoleFilterApiParam(role),
            }),
        [activeOrganizationId, page, limit, search, role]
    )

    const members = membersQuery.data?.members || []
    const rawPagination = membersQuery.data?.pagination || {
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
    }

    const paginationTotal = rawPagination.total
    const paginationPage = rawPagination.page
    const paginationLimit = rawPagination.limit
    const paginationTotalPages = rawPagination.totalPages

    const pagination = useMemo(
        () =>
            createMemberListPagination({
                total: paginationTotal,
                page: paginationPage,
                limit: paginationLimit,
                totalPages: paginationTotalPages,
            }),
        [paginationTotal, paginationPage, paginationLimit, paginationTotalPages]
    )

    const isLoading = isSearchLoading || membersQuery.isLoading
    const primaryDataSource: PrimaryDataSource = getQueryPrimaryDataSource({
        queryKey: membersQueryKey,
        hasData: Boolean(membersQuery.data),
        isFetchedAfterMount: membersQuery.isFetchedAfterMount,
        isFetching: membersQuery.isFetching,
        isPlaceholderData: membersQuery.isPlaceholderData,
    })

    usePrimaryDataVisibleMetric({
        routeId: "org.team.members",
        isVisible: !isLoading && Boolean(membersQuery.data),
        dataSource: primaryDataSource,
        queryKey: membersQueryKey,
        itemCount: members.length,
        detail: { page, limit },
    })

    const handleEditMember = useCallback(
        (memberId: string) => {
            const member = members.find((m: OrganizationMember) => m.id === memberId)
            dispatch({ type: "OPEN_EDIT", memberId, currentRole: member?.role ?? "" })
        },
        [members]
    )

    const memberActions = useMemberActions({
        currentUserId,
        currentUserRole,
        updateEditMember: handleEditMember,
        updateRemoveMember: (id: string) => dispatch({ type: "OPEN_REMOVE", memberId: id }),
        updateInvitationModal: () => {},
        activeOrganizationId,
    })

    const selectedMemberId = getEditingMemberId(dialog)
    const removingMemberId = getRemovingMemberId(dialog)

    const selectedMember = selectedMemberId
        ? (members.find((m: OrganizationMember) => m.id === selectedMemberId) ?? null)
        : null

    const removingMember = removingMemberId
        ? (members.find((m: OrganizationMember) => m.id === removingMemberId) ?? null)
        : null

    useEffect(() => {
        if (!membersQuery.isError) return
        showRetryErrorToast(t("members.toast.loadFailed"), {
            onRetry: () => membersQuery.refetch(),
        })
    }, [membersQuery.isError, membersQuery.refetch, t])

    const closeDialog = useCallback(() => dispatch({ type: "CLOSE" }), [])

    const {
        sendInvitations,
        confirmEditRole,
        confirmRemoveMember,
        isUpdatingRole,
        isRemovingMember,
        isInviting,
    } = useMembersMutationActions({
        organizationId: activeOrganizationId,
        invitationsHref,
        dialog,
        selectedMember,
        removingMember,
        closeDialog,
    })

    const { selectedRoles, selectedStatuses, updateRoleFilter, updateStatusFilter } =
        useMemberListFilters({
            role,
            status,
            roleOptions: ROLE_OPTIONS_WITH_OWNER,
            defaultStatus: FILTER_STATES.MEMBER_STATUS.DEFAULT_MEMBERS,
            defaultStatusValues: MEMBER_STATUS_VALUES,
            updateRoles,
            updateStatus,
        })

    const { isExporting, exportMembers } = useMembersExport({
        totalMembers: pagination.total,
        search,
        role,
        organizationId: activeOrganizationId,
    })

    const onRowClick = useCallback(
        (member: OrganizationMember) => openProfile(member.user.id),
        [openProfile]
    )

    const value = useMemo(
        (): MembersPageContextValue => ({
            state: {
                members,
                isLoading,
                isPlaceholderData: membersQuery.isPlaceholderData,
                isFetching: membersQuery.isFetching,
                pagination,
                searchValue: search || "",
                selectedRoles,
                selectedStatuses,
                roleOptions: ROLE_OPTIONS_WITH_OWNER,
                statusOptions: MEMBER_STATUS_OPTIONS,
                hasActiveFilters,
                currentUserId,
                currentUserRole,
                isExporting,
                dialog,
                selectedMember,
                removingMember,
                isUpdatingRole,
                isRemovingMember,
                isInviting,
                availableRoles: ROLE_OPTIONS,
                canInviteMembers: memberActions.canInviteMembers(),
                isStartingMemberDm,
            },
            actions: {
                updateSearch,
                updateRoleFilter,
                updateStatusFilter,
                updatePage,
                updatePageSize,
                clearFilters,
                openEditDialog: handleEditMember,
                openRemoveDialog: (memberId: string) => dispatch({ type: "OPEN_REMOVE", memberId }),
                openInviteDialog: () => dispatch({ type: "OPEN_INVITE" }),
                openProfileDialog: openProfile,
                closeDialog,
                updateDialogRole: (role: string) => dispatch({ type: "UPDATE_ROLE", role }),
                confirmEditRole,
                confirmRemoveMember,
                sendInvitations,
                exportMembers,
                editRole: memberActions.editRole,
                removeMember: memberActions.removeMember,
                canPerformAction: memberActions.canPerformAction,
                onRowClick,
                startMemberDm: onStartMemberDm,
            },
            meta: {
                organizationId: activeOrganizationId,
                organizationSlug: slug,
                currentUserId,
                currentUserRole,
                invitationsHref,
            },
        }),
        [
            members,
            isLoading,
            membersQuery.isPlaceholderData,
            membersQuery.isFetching,
            pagination,
            search,
            selectedRoles,
            selectedStatuses,
            hasActiveFilters,
            currentUserId,
            currentUserRole,
            isExporting,
            dialog,
            selectedMember,
            removingMember,
            isUpdatingRole,
            isRemovingMember,
            isInviting,
            isStartingMemberDm,
            memberActions,
            updateSearch,
            updateRoleFilter,
            updateStatusFilter,
            updatePage,
            updatePageSize,
            clearFilters,
            handleEditMember,
            closeDialog,
            confirmEditRole,
            confirmRemoveMember,
            sendInvitations,
            exportMembers,
            onRowClick,
            onStartMemberDm,
            openProfile,
            activeOrganizationId,
            slug,
            invitationsHref,
        ]
    )

    return <MembersPageContext value={value}>{children}</MembersPageContext>
}
