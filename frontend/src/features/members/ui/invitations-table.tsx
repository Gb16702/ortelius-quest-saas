import type { ColumnDef, RowSelectionState } from "@tanstack/react-table"
import {
    Archive,
    ArchiveRestore,
    ChevronsUpDown,
    Forward,
    MoreVertical,
    UserMinus,
    UserPen,
} from "lucide-react"
import { useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { parseRole } from "@/entities/access"
import type { Invitation } from "@/entities/invitation"
import { formatDateLong } from "@/shared/lib/date"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { DataTable } from "@/shared/ui/data-table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { InvitationsIcon } from "@/shared/ui/sidebar-icons"
import { Spinner } from "@/shared/ui/spinner"
import type { TableSkeletonConfig } from "@/shared/ui/table-skeleton"

const INVITATIONS_TABLE_SKELETON_CONFIG: TableSkeletonConfig = {
    name: "invitations",
    columns: [
        { type: "text-medium", align: "left" },
        { type: "text-short", align: "left" },
        { type: "badge", align: "left" },
        { type: "text-medium", align: "left" },
        { type: "date", align: "left" },
        { type: "actions", align: "right" },
    ],
    defaultRows: 8,
}

interface InvitationTableProps {
    invitations: Invitation[]
    isLoading: boolean
    hasActiveFilters: boolean
    onClearFilters: () => void
    onResendInvitation: (invitation: Invitation) => void
    onEditInvitationRole: (invitation: Invitation) => void
    onCancelInvitation: (invitation: Invitation) => void
    onArchiveInvitation: (invitation: Invitation) => void
    onUnarchiveInvitation: (invitation: Invitation) => void
    isArchiving: boolean
    isUnarchiving: boolean
    canManageInvitations: boolean
    pageSize: number
    onPageSizeChange: (size: number) => void
    onPageChange: (page: number) => void
    paginationInfo?: {
        currentPage: number
        totalPages: number
        total: number
        limit: number
    }
    isPlaceholderData: boolean
    isFetching: boolean
    rowSelection: RowSelectionState
    onRowSelectionChange: (selection: RowSelectionState) => void
    onExport?: () => void
    canExport?: boolean
    isExporting?: boolean
}

export const InvitationsTable = ({
    invitations,
    isLoading,
    hasActiveFilters,
    onClearFilters,
    onResendInvitation,
    onEditInvitationRole,
    onCancelInvitation,
    onArchiveInvitation,
    onUnarchiveInvitation,
    isArchiving,
    isUnarchiving,
    canManageInvitations,
    pageSize,
    onPageSizeChange,
    onPageChange,
    paginationInfo,
    isPlaceholderData,
    isFetching,
    rowSelection,
    onRowSelectionChange,
    onExport,
    canExport = false,
    isExporting = false,
}: InvitationTableProps) => {
    const { t } = useTranslation("team")
    const { t: tCommon } = useTranslation("common")
    const actionsRef = useRef({
        onResendInvitation,
        onEditInvitationRole,
        onCancelInvitation,
        onArchiveInvitation,
        onUnarchiveInvitation,
        onExport,
    })
    actionsRef.current = {
        onResendInvitation,
        onEditInvitationRole,
        onCancelInvitation,
        onArchiveInvitation,
        onUnarchiveInvitation,
        onExport,
    }

    const columns: ColumnDef<Invitation>[] = useMemo(
        () => [
            {
                id: "select",
                header: ({ table }) => (
                    <Checkbox
                        checked={
                            table.getIsAllPageRowsSelected() ||
                            (table.getIsSomePageRowsSelected() && "indeterminate")
                        }
                        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                        aria-label={t("invitations.table.selectAllAriaLabel")}
                    />
                ),
                cell: ({ row }) => (
                    <Checkbox
                        checked={row.getIsSelected()}
                        onCheckedChange={(value) => row.toggleSelected(!!value)}
                        aria-label={t("invitations.table.selectRowAriaLabel")}
                    />
                ),
                enableSorting: false,
                enableHiding: false,
            },
            {
                accessorKey: "email",
                id: "invitation",
                header: () => (
                    <span className="font-normal text-ds-fg-muted">
                        {t("invitations.table.emailHeader")}
                    </span>
                ),
                cell: ({ row }) => {
                    const invitation = row.original
                    return <div>{invitation.email}</div>
                },
            },
            {
                accessorKey: "role",
                header: ({ column }) => {
                    return (
                        <Button
                            variant="text"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="!p-0 group font-normal text-ds-fg-muted"
                        >
                            {t("invitations.table.roleHeader")}
                            <ChevronsUpDown className="!w-4 !h-4 ml-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </Button>
                    )
                },
                cell: ({ row }) => {
                    const invitation = row.original
                    const parsed = parseRole(invitation.role)
                    return (
                        <span className="text-sm">
                            {parsed ? tCommon(`role.${parsed}`) : invitation.role}
                        </span>
                    )
                },
            },
            {
                accessorKey: "status",
                header: () => (
                    <span className="font-normal text-ds-fg-muted">
                        {t("invitations.table.statusHeader")}
                    </span>
                ),
                cell: ({ row }) => {
                    const invitation = row.original
                    const statusColors = {
                        pending: "bg-ds-amber-600",
                        accepted: "bg-ds-teal-600",
                        canceled: "bg-ds-danger-solid",
                        expired: "bg-ds-gray-500",
                        archived: "bg-ds-gray-500",
                    }
                    return (
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-2 w-2 rounded-full ${statusColors[invitation.status]}`}
                            />
                            <span className="text-ds-fg">
                                {t(`invitationStatus.${invitation.status}`, {
                                    defaultValue: invitation.status,
                                })}
                            </span>
                        </div>
                    )
                },
            },
            {
                accessorKey: "inviterName",
                header: () => (
                    <span className="font-normal text-ds-fg-muted">
                        {t("invitations.table.invitedByHeader")}
                    </span>
                ),
                cell: ({ row }) => {
                    const invitation = row.original
                    return <div className="text-ds-fg">{invitation.inviterName}</div>
                },
            },
            {
                accessorKey: "expiresAt",
                header: ({ column }) => {
                    return (
                        <Button
                            variant="text"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="!p-0 group font-normal text-ds-fg-muted"
                        >
                            {t("invitations.table.expiresAtHeader")}
                            <ChevronsUpDown className="!w-4 !h-4 ml-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </Button>
                    )
                },
                cell: ({ row }) => {
                    const invitation = row.original
                    return (
                        <div className="text-ds-fg-muted">
                            {formatDateLong(invitation.expiresAt)}
                        </div>
                    )
                },
            },
            {
                id: "actions",
                enableHiding: false,
                header: () => {
                    if (!actionsRef.current.onExport || invitations.length < 1) return null

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button radius={"full"} variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">
                                            {t("invitations.table.tableActionsLabel")}
                                        </span>
                                        <MoreVertical className="size-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => actionsRef.current.onExport?.()}
                                        disabled={!canExport || isExporting}
                                    >
                                        {isExporting && <Spinner className="mr-1" />}
                                        {isExporting
                                            ? t("invitations.table.exporting")
                                            : t("invitations.table.exportCsv")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
                // FIXME: refactor pending
                // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: cognitive complexity refactor pending
                cell: ({ row }) => {
                    const invitation = row.original

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button radius={"full"} variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">
                                            {t("invitations.table.openMenuLabel")}
                                        </span>
                                        <MoreVertical className="size-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {canManageInvitations && invitation.status === "pending" && (
                                        <>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    actionsRef.current.onResendInvitation(
                                                        invitation
                                                    )
                                                }
                                            >
                                                <Forward className="mr-1 size-4 text-ds-fg" />
                                                {t("invitations.table.resend")}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    actionsRef.current.onEditInvitationRole(
                                                        invitation
                                                    )
                                                }
                                            >
                                                <UserPen className="mr-1 size-4 text-ds-fg" />
                                                {t("invitations.table.editRole")}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                    {canManageInvitations && (
                                        <DropdownMenuItem
                                            disabled={isArchiving || isUnarchiving}
                                            onClick={() =>
                                                invitation.archived
                                                    ? actionsRef.current.onUnarchiveInvitation(
                                                          invitation
                                                      )
                                                    : actionsRef.current.onArchiveInvitation(
                                                          invitation
                                                      )
                                            }
                                        >
                                            {(isArchiving && !invitation.archived) ||
                                            (isUnarchiving && invitation.archived) ? (
                                                <Spinner className="!w-4 !h-4 mr-2" />
                                            ) : invitation.archived ? (
                                                <ArchiveRestore className="mr-1 size-4 text-ds-fg" />
                                            ) : (
                                                <Archive className="mr-1 size-4 text-ds-fg" />
                                            )}
                                            {(isArchiving && !invitation.archived) ||
                                            (isUnarchiving && invitation.archived)
                                                ? invitation.archived
                                                    ? t("invitations.table.removingFromArchive")
                                                    : t("invitations.table.addingToArchive")
                                                : invitation.archived
                                                  ? t("invitations.table.removeFromArchive")
                                                  : t("invitations.table.addToArchive")}
                                        </DropdownMenuItem>
                                    )}
                                    {canManageInvitations && invitation.status === "pending" && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={() =>
                                                    actionsRef.current.onCancelInvitation(
                                                        invitation
                                                    )
                                                }
                                            >
                                                <UserMinus className="mr-1 size-4" />
                                                {t("invitations.table.cancel")}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
            },
        ],
        [
            invitations.length,
            canManageInvitations,
            canExport,
            isExporting,
            isArchiving,
            isUnarchiving,
            t,
            tCommon,
        ]
    )

    return (
        <DataTable<Invitation, string | number>
            columns={columns}
            data={invitations}
            isLoading={isLoading}
            hideSearch={true}
            skeletonConfig={INVITATIONS_TABLE_SKELETON_CONFIG}
            paginationInfo={paginationInfo}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
            onPageChange={onPageChange}
            showPageInfo={true}
            pageInfoLabel={t("invitations.table.pageInfoLabel")}
            isPlaceholderData={isPlaceholderData}
            isFetching={isFetching}
            enableRowSelection={true}
            rowSelection={rowSelection}
            onRowSelectionChange={onRowSelectionChange}
            emptyState={
                <Empty className="border-0">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <InvitationsIcon />
                        </EmptyMedia>
                        <EmptyTitle>{t("invitations.table.emptyTitle")}</EmptyTitle>
                    </EmptyHeader>
                    {hasActiveFilters && (
                        <EmptyContent>
                            <Button
                                variant="outline"
                                size="sm"
                                radius="full"
                                onClick={onClearFilters}
                            >
                                {t("invitations.table.clearFilters")}
                            </Button>
                        </EmptyContent>
                    )}
                </Empty>
            }
        />
    )
}
