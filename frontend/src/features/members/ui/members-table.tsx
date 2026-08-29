import type { ColumnDef } from "@tanstack/react-table"
import { ChevronsUpDown, MessageSquare, MoreVertical, UserMinus, UserPen, View } from "lucide-react"
import { useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { getRoleLevel, parseRole } from "@/entities/access"
import type { OrganizationMember } from "@/entities/member"
import { PresenceIndicator, usePresenceStore } from "@/entities/presence"
import { generateAvatarUrl } from "@/shared/lib/avatar"
import { formatDateLong } from "@/shared/lib/date"
import { Avatar, AvatarImage } from "@/shared/ui/avatar"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { DataTable } from "@/shared/ui/data-table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { MembersIcon } from "@/shared/ui/sidebar-icons"
import { Spinner } from "@/shared/ui/spinner"
import type { TableSkeletonConfig } from "@/shared/ui/table-skeleton"
import { useMembersPage } from "../model/members-page.provider"

const MEMBERS_TABLE_SKELETON_CONFIG: TableSkeletonConfig = {
    name: "members",
    columns: [
        { type: "avatar-name", align: "left" },
        { type: "text-short", align: "left" },
        { type: "text-short", align: "left" },
        { type: "date", align: "left" },
        { type: "date", align: "left" },
        { type: "actions", align: "right" },
    ],
    defaultRows: 8,
}

const calculateRoleLevel = (role: string): number => {
    const parsed = parseRole(role)
    return parsed ? getRoleLevel(parsed) : 0
}

function LastSeenCell({ member }: { member: OrganizationMember }) {
    const { t } = useTranslation("team")
    const { t: tCommon } = useTranslation("common")
    const presence = usePresenceStore((state) => state.presenceMap.get(member.user.id))
    const isOnline = presence?.status === "online"
    const lastSeenAt = member.lastSeenAt

    if (isOnline) {
        return (
            <div className="flex items-center gap-2 text-ds-fg">
                <div className="h-2 w-2 rounded-full bg-ds-green-700" />
                <span>{t("members.table.online")}</span>
            </div>
        )
    }

    return (
        <div className="text-ds-fg-muted">
            {lastSeenAt ? formatDateLong(lastSeenAt) : tCommon("date.never")}
        </div>
    )
}

export function MembersTable() {
    const { t } = useTranslation("team")
    const { t: tCommon } = useTranslation("common")
    const { state, actions } = useMembersPage()

    const actionsRef = useRef({
        openProfileDialog: actions.openProfileDialog,
        editRole: actions.editRole,
        removeMember: actions.removeMember,
        canPerformAction: actions.canPerformAction,
        exportMembers: actions.exportMembers,
        startMemberDm: actions.startMemberDm,
    })
    actionsRef.current = {
        openProfileDialog: actions.openProfileDialog,
        editRole: actions.editRole,
        removeMember: actions.removeMember,
        canPerformAction: actions.canPerformAction,
        exportMembers: actions.exportMembers,
        startMemberDm: actions.startMemberDm,
    }

    const columns: ColumnDef<OrganizationMember>[] = useMemo(
        () => [
            {
                accessorKey: "user.name",
                id: "member",
                header: () => (
                    <span className="font-normal text-ds-fg-muted">
                        {t("members.table.memberHeader")}
                    </span>
                ),
                cell: ({ row }) => {
                    const member = row.original
                    const dicebearAvatar = generateAvatarUrl(member.user.name)
                    return (
                        <div className={"flex items-center space-x-3"}>
                            <div className="relative">
                                <Avatar className="h-6 w-6">
                                    <AvatarImage
                                        src={member.user.image || dicebearAvatar}
                                        alt={member.user.name}
                                    />
                                </Avatar>
                                <PresenceIndicator
                                    userId={member.user.id}
                                    size="md"
                                    className="absolute right-0 bottom-0"
                                    showOffline
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 font-medium">
                                    {member.user.name}
                                    {member.user.id === state.currentUserId && (
                                        <Badge variant="accent" size={"sm"}>
                                            {t("members.table.youBadge")}
                                        </Badge>
                                    )}
                                </div>
                                <div className="text-ds-fg-muted text-sm">{member.user.email}</div>
                            </div>
                        </div>
                    )
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
                            {t("members.table.roleHeader")}
                            <ChevronsUpDown className="!w-4 !h-4 ml-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </Button>
                    )
                },
                sortingFn: (rowA, rowB) => {
                    const roleA = rowA.getValue("role") as string
                    const roleB = rowB.getValue("role") as string
                    return calculateRoleLevel(roleA) - calculateRoleLevel(roleB)
                },
                cell: ({ row }) => {
                    const member = row.original
                    const parsed = parseRole(member.role)
                    return (
                        <span className="text-sm">
                            {parsed ? tCommon(`role.${parsed}`) : member.role}
                        </span>
                    )
                },
            },
            {
                accessorKey: "user.twoFactorEnabled",
                id: "twoFactor",
                header: () => (
                    <span className="font-normal text-ds-fg-muted">
                        {t("members.table.twoFactorHeader")}
                    </span>
                ),
                cell: ({ row }) => {
                    const member = row.original
                    const twoFactorEnabled = member.user.twoFactorEnabled
                    return (
                        <div className="flex items-center gap-2">
                            <div
                                className={`h-2 w-2 rounded-full ${twoFactorEnabled ? "bg-ds-teal-600" : "bg-ds-gray-500"}`}
                            />
                            <span className="text-ds-fg">
                                {twoFactorEnabled
                                    ? t("members.table.twoFactorEnabled")
                                    : t("members.table.twoFactorDisabled")}
                            </span>
                        </div>
                    )
                },
            },
            {
                accessorKey: "createdAt",
                header: ({ column }) => {
                    return (
                        <Button
                            variant="text"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="!p-0 group font-normal text-ds-fg-muted"
                        >
                            {t("members.table.joinedOnHeader")}
                            <ChevronsUpDown className="!w-4 !h-4 ml-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </Button>
                    )
                },
                cell: ({ row }) => {
                    return (
                        <div className="text-ds-fg-muted">
                            {formatDateLong(row.getValue("createdAt"))}
                        </div>
                    )
                },
            },
            {
                id: "lastSeen",
                header: () => (
                    <span className="font-normal text-ds-fg-muted">
                        {t("members.table.lastSeenHeader")}
                    </span>
                ),
                cell: ({ row }) => <LastSeenCell member={row.original} />,
            },
            {
                id: "actions",
                enableHiding: false,
                header: () => {
                    if (state.members.length < 1) return null

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button radius={"full"} variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">
                                            {t("members.table.tableActionsLabel")}
                                        </span>
                                        <MoreVertical className="size-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={() => actionsRef.current.exportMembers()}
                                        disabled={!state.canInviteMembers || state.isExporting}
                                    >
                                        {state.isExporting && <Spinner className="mr-1" />}
                                        {state.isExporting
                                            ? t("members.table.exporting")
                                            : t("members.table.exportCsv")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
                cell: ({ row }) => {
                    const member = row.original

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        radius={"full"}
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <span className="sr-only">
                                            {t("members.table.openMenuLabel")}
                                        </span>
                                        <MoreVertical className="size-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            actionsRef.current.openProfileDialog(member.user.id)
                                        }}
                                    >
                                        <View className="mr-1 size-4 text-ds-fg" />
                                        {t("members.table.viewProfile")}
                                    </DropdownMenuItem>
                                    {member.user.id !== state.currentUserId &&
                                        actionsRef.current.startMemberDm && (
                                            <DropdownMenuItem
                                                disabled={state.isStartingMemberDm}
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    actionsRef.current.startMemberDm?.(member)
                                                }}
                                            >
                                                <MessageSquare className="mr-1 size-4 text-ds-fg" />
                                                {t("members.table.chatWithMember", {
                                                    name: member.user.name,
                                                })}
                                            </DropdownMenuItem>
                                        )}
                                    {actionsRef.current.canPerformAction(
                                        member.role,
                                        member.user.id
                                    ) && (
                                        <>
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    actionsRef.current.editRole(member)
                                                }}
                                            >
                                                <UserPen className="mr-1 size-4 text-ds-fg" />
                                                {t("members.table.editRole")}
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                variant="destructive"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    actionsRef.current.removeMember(member)
                                                }}
                                            >
                                                <UserMinus className="mr-1 size-4" />
                                                {t("members.table.removeMember")}
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
            state.members.length,
            state.currentUserId,
            state.canInviteMembers,
            state.isExporting,
            state.isStartingMemberDm,
            t,
            tCommon,
        ]
    )

    return (
        <DataTable<OrganizationMember, string | number | boolean | null>
            columns={columns}
            data={state.members}
            isLoading={state.isLoading}
            hideSearch={true}
            skeletonConfig={MEMBERS_TABLE_SKELETON_CONFIG}
            paginationInfo={state.pagination}
            pageSize={state.pagination.limit}
            onPageSizeChange={actions.updatePageSize}
            onPageChange={actions.updatePage}
            showPageInfo={true}
            pageInfoLabel={t("members.table.pageInfoLabel")}
            isPlaceholderData={state.isPlaceholderData}
            isFetching={state.isFetching}
            onRowClick={actions.onRowClick}
            emptyState={
                <Empty className="border-0">
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <MembersIcon />
                        </EmptyMedia>
                        <EmptyTitle>{t("members.table.emptyTitle")}</EmptyTitle>
                    </EmptyHeader>
                    {state.hasActiveFilters && (
                        <EmptyContent>
                            <Button
                                variant="outline"
                                size="sm"
                                radius="full"
                                onClick={actions.clearFilters}
                            >
                                {t("members.table.clearFilters")}
                            </Button>
                        </EmptyContent>
                    )}
                </Empty>
            }
        />
    )
}
