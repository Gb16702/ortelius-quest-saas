import type { RowSelectionState } from "@tanstack/react-table"
import {
    createContext,
    type ReactNode,
    use,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react"
import { useTranslation } from "react-i18next"
import { ROLE_OPTIONS_WITH_OWNER, type Role, useUserRole } from "@/entities/access"
import {
    type Invitation,
    type InviteForm,
    invitationsKeys,
    useInvitations,
} from "@/entities/invitation"
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
import {
    FILTER_STATES,
    getInvitationStatusFilterApiParam,
    getRoleFilterApiParam,
} from "../lib/member-url.state"
import { useInvitationsExport } from "./hooks/use-invitations-export"
import { useInvitationsMutationActions } from "./hooks/use-invitations-mutation-actions"
import { useInvitationsSearch } from "./hooks/use-invitations-search"
import { useMemberActions } from "./hooks/use-member-actions"
import { useMemberListFilters } from "./hooks/use-member-list-filters"

const INVITATION_STATUS_VALUES = ["accepted", "pending", "canceled", "expired"] as const

export const INVITATION_STATUS_OPTIONS: MultiSelectOption[] = [
    { value: "accepted", label: "Accepted", color: "bg-ds-teal-600" },
    { value: "pending", label: "Pending", color: "bg-ds-amber-600" },
    { value: "canceled", label: "Canceled", color: "bg-ds-danger-solid" },
    { value: "expired", label: "Expired", color: "bg-ds-gray-300" },
    { value: "archived", label: "Archived", color: "bg-ds-gray-300" },
]

interface InvitationsPageState {
    invitations: Invitation[]
    isLoading: boolean
    isPlaceholderData: boolean
    isFetching: boolean
    pagination: {
        total: number
        currentPage: number
        limit: number
        totalPages: number
    }
    search: string
    selectedRoles: string[]
    selectedStatuses: string[]
    roleOptions: MultiSelectOption[]
    hasActiveFilters: boolean
    editingInvitation: Invitation | undefined
    cancelingInvitation: Invitation | undefined
    showInviteDialog: boolean
    selectedRole: string
    rowSelection: RowSelectionState
    isExporting: boolean
    isArchiving: boolean
    isUnarchiving: boolean
    isCanceling: boolean
    isInviting: boolean
    isUpdatingRole: boolean
    canManageInvitations: boolean
    pageSize: number
}

interface InvitationsPageActions {
    updateSearch: (search: string) => void
    updateRoleFilter: (values: string[]) => void
    updateStatusFilter: (values: string[]) => void
    updatePage: (page: number) => void
    updatePageSize: (size: number) => void
    clearFilters: () => void
    openInviteDialog: () => void
    closeInviteDialog: () => void
    setSelectedRole: (role: string) => void
    setRowSelection: (selection: RowSelectionState) => void
    sendInvitations: (forms: InviteForm[]) => void
    resendInvitation: (invitation: Invitation) => void
    editInvitationRole: (invitation: Invitation) => void
    promptCancelInvitation: (invitation: Invitation) => void
    confirmCancelInvitation: () => void
    confirmEditRole: () => void
    archiveInvitation: (invitation: Invitation) => void
    unarchiveInvitation: (invitation: Invitation) => void
    closeModals: () => void
    exportInvitations: () => Promise<void>
}

interface InvitationsPageMeta {
    organizationId: string
    organizationSlug: string
    currentUserId: string
    currentUserRole: string
    invitationsHref: string
}

interface InvitationsPageContextValue {
    state: InvitationsPageState
    actions: InvitationsPageActions
    meta: InvitationsPageMeta
}

const InvitationsPageContext = createContext<InvitationsPageContextValue | null>(null)

export function useInvitationsPage(): InvitationsPageContextValue {
    const ctx = use(InvitationsPageContext)
    if (!ctx) {
        throw new Error("useInvitationsPage must be used within InvitationsPageProvider")
    }
    return ctx
}

interface InvitationsPageProviderProps {
    sessionData: SessionData
    initialCurrentUserRole?: Role | null
    children: ReactNode
}

export function InvitationsPageProvider({
    sessionData,
    initialCurrentUserRole,
    children,
}: InvitationsPageProviderProps) {
    const { t } = useTranslation("team")
    const activeOrganizationId = sessionData?.session?.activeOrganizationId ?? ""
    const currentUserId = sessionData?.user?.id ?? ""
    const { meta, state: orgState } = useOrg()
    const initialUserRole = initialCurrentUserRole ?? orgState.role
    const { data: currentUserRole = initialUserRole } = useUserRole(activeOrganizationId, {
        initialData: initialUserRole,
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
    } = useInvitationsSearch()

    const [editInvitation, setEditInvitation] = useState<string | null>(null)
    const [cancelInvitation, setCancelInvitation] = useState<string | null>(null)
    const [showInviteDialog, setShowInviteDialog] = useState(false)
    const [selectedRole, setSelectedRole] = useState<string>("")
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

    const closeModals = useCallback(() => {
        setEditInvitation(null)
        setCancelInvitation(null)
        setSelectedRole("")
    }, [])

    const memberActions = useMemberActions({
        currentUserId,
        currentUserRole,
        updateEditMember: () => {},
        updateRemoveMember: () => {},
        updateInvitationModal: setEditInvitation,
        activeOrganizationId,
    })

    const invitationsQuery = useInvitations(
        activeOrganizationId,
        {
            page,
            limit,
            search,
            role: getRoleFilterApiParam(role),
            status: getInvitationStatusFilterApiParam(status),
        },
        { enabled: true }
    )
    const invitationsQueryKey = useMemo(
        () =>
            invitationsKeys.list(activeOrganizationId, {
                page,
                limit,
                search,
                role: getRoleFilterApiParam(role),
                status: getInvitationStatusFilterApiParam(status),
            }),
        [activeOrganizationId, page, limit, search, role, status]
    )

    const invitations = invitationsQuery.data?.invitations || []
    const rawPagination = invitationsQuery.data?.pagination || {
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

    const isLoading = isSearchLoading || invitationsQuery.isLoading
    const isPlaceholderData = invitationsQuery.isPlaceholderData
    const isFetching = invitationsQuery.isFetching
    const primaryDataSource: PrimaryDataSource = getQueryPrimaryDataSource({
        queryKey: invitationsQueryKey,
        hasData: Boolean(invitationsQuery.data),
        isFetchedAfterMount: invitationsQuery.isFetchedAfterMount,
        isFetching,
        isPlaceholderData,
    })

    usePrimaryDataVisibleMetric({
        routeId: "org.team.invitations",
        isVisible: !isLoading && Boolean(invitationsQuery.data),
        dataSource: primaryDataSource,
        queryKey: invitationsQueryKey,
        itemCount: invitations.length,
        detail: { page, limit },
    })

    const editingInvitation = invitations.find((inv: Invitation) => inv.id === editInvitation)
    const cancelingInvitation = invitations.find((inv: Invitation) => inv.id === cancelInvitation)

    useEffect(() => {
        if (!invitationsQuery.isError) return
        showRetryErrorToast(t("invitations.toast.loadFailed"), {
            onRetry: () => invitationsQuery.refetch(),
        })
    }, [invitationsQuery.isError, invitationsQuery.refetch, t])

    const {
        sendInvitations,
        resendInvitation,
        promptCancelInvitation,
        confirmCancelInvitation,
        confirmEditRole,
        archiveInvitation,
        unarchiveInvitation,
        isArchiving,
        isUnarchiving,
        isCanceling,
        isInviting,
        isUpdatingRole,
    } = useInvitationsMutationActions({
        organizationId: activeOrganizationId,
        invitationsHref,
        invitations,
        rowSelection,
        setRowSelection,
        setCancelInvitation,
        setShowInviteDialog,
        editingInvitation,
        cancelingInvitation,
        selectedRole,
        closeModals,
    })

    const openEditInvitationRole = useCallback((invitation: Invitation) => {
        setEditInvitation(invitation.id)
        setSelectedRole(invitation.role)
    }, [])

    const { selectedRoles, selectedStatuses, updateRoleFilter, updateStatusFilter } =
        useMemberListFilters({
            role,
            status,
            roleOptions: ROLE_OPTIONS_WITH_OWNER,
            defaultStatus: FILTER_STATES.MEMBER_STATUS.DEFAULT_INVITATIONS,
            defaultStatusValues: INVITATION_STATUS_VALUES,
            updateRoles,
            updateStatus,
        })

    const { isExporting, exportInvitations } = useInvitationsExport({
        totalInvitations: pagination.total,
        search,
        role,
        status,
        organizationId: activeOrganizationId,
    })

    const _selectedCount = Object.keys(rowSelection).filter((key) => rowSelection[key]).length

    const value = useMemo(
        (): InvitationsPageContextValue => ({
            state: {
                invitations,
                isLoading,
                isPlaceholderData,
                isFetching,
                pagination,
                search: search || "",
                selectedRoles,
                selectedStatuses,
                roleOptions: ROLE_OPTIONS_WITH_OWNER,
                hasActiveFilters,
                editingInvitation,
                cancelingInvitation,
                showInviteDialog,
                selectedRole,
                rowSelection,
                isExporting,
                isArchiving,
                isUnarchiving,
                isCanceling,
                isInviting,
                isUpdatingRole,
                canManageInvitations: memberActions.canInviteMembers(),
                pageSize: limit,
            },
            actions: {
                updateSearch,
                updateRoleFilter,
                updateStatusFilter,
                updatePage,
                updatePageSize,
                clearFilters,
                openInviteDialog: () => setShowInviteDialog(true),
                closeInviteDialog: () => setShowInviteDialog(false),
                setSelectedRole,
                setRowSelection,
                sendInvitations,
                resendInvitation,
                editInvitationRole: openEditInvitationRole,
                promptCancelInvitation,
                confirmCancelInvitation,
                confirmEditRole,
                archiveInvitation,
                unarchiveInvitation,
                closeModals,
                exportInvitations,
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
            invitations,
            isLoading,
            isPlaceholderData,
            isFetching,
            pagination,
            search,
            selectedRoles,
            selectedStatuses,
            hasActiveFilters,
            editingInvitation,
            cancelingInvitation,
            showInviteDialog,
            selectedRole,
            rowSelection,
            isExporting,
            isArchiving,
            isUnarchiving,
            isCanceling,
            isInviting,
            isUpdatingRole,
            memberActions,
            limit,
            updateSearch,
            updateRoleFilter,
            updateStatusFilter,
            updatePage,
            updatePageSize,
            clearFilters,
            sendInvitations,
            resendInvitation,
            openEditInvitationRole,
            promptCancelInvitation,
            confirmCancelInvitation,
            confirmEditRole,
            archiveInvitation,
            unarchiveInvitation,
            closeModals,
            exportInvitations,
            activeOrganizationId,
            slug,
            currentUserId,
            currentUserRole,
            invitationsHref,
        ]
    )

    return <InvitationsPageContext value={value}>{children}</InvitationsPageContext>
}
