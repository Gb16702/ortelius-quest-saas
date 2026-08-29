import type { Column, ColumnDef } from "@tanstack/react-table"
import {
    ChevronsUpDown,
    CloudDownload,
    Eye,
    MessageSquare,
    MoreVertical,
    Share2,
    Star,
    UserPlus,
} from "lucide-react"
import { useMemo, useRef } from "react"
import { useTranslation } from "react-i18next"
import { GuestBadge } from "@/entities/member"
import { PresenceIndicator } from "@/entities/presence"
import { RequestStatusDisplay } from "@/entities/request"
import type { SessionResponse } from "@/entities/session"
import { generateAvatarUrl } from "@/shared/lib/avatar"
import { formatDateRangeShort, formatRelativeTimeCompact } from "@/shared/lib/date"
import { Avatar, AvatarImage } from "@/shared/ui/avatar"
import { Button } from "@/shared/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Spinner } from "@/shared/ui/spinner"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { getRequestActionPolicy } from "../lib/request-action-policy"
import {
    getPersonalRequestOrganizationDisplay,
    getRequestChatRecipientName,
} from "../lib/request-chat-recipient"
import type { UserRequest } from "../model/request"
import { PriorityBadge } from "./priority-badge"

interface UseRequestColumnsProps {
    sessionData: SessionResponse | null
    onViewRequest: (reqNumber: string) => void
    onDownloadPdf: (request: UserRequest) => void
    onShareRequest?: (request: UserRequest) => void
    favoriteRequestIds?: ReadonlySet<string>
    onToggleFavoriteRequest?: (request: UserRequest) => void
    onExport?: () => void
    onAssignRequest?: (request: UserRequest) => void
    currentUserRole?: string | null
    canExport?: boolean
    isExporting?: boolean
    requestsCount?: number
    basePath: string
    onNavigate?: (href: string) => void
}

export function useRequestColumns({
    sessionData,
    onViewRequest,
    onDownloadPdf,
    onShareRequest,
    favoriteRequestIds = new Set(),
    onToggleFavoriteRequest,
    onExport,
    onAssignRequest,
    currentUserRole,
    canExport = false,
    isExporting = false,
    requestsCount = 0,
    basePath,
    onNavigate,
}: UseRequestColumnsProps) {
    const { t } = useTranslation("requests")
    const actionsRef = useRef({
        onViewRequest,
        onDownloadPdf,
        onShareRequest,
        onToggleFavoriteRequest,
        onExport,
        onAssignRequest,
    })
    actionsRef.current = {
        onViewRequest,
        onDownloadPdf,
        onShareRequest,
        onToggleFavoriteRequest,
        onExport,
        onAssignRequest,
    }

    return useMemo(
        (): ColumnDef<UserRequest>[] => [
            {
                accessorKey: "reqNumber",
                id: "request",
                header: () => (
                    <span className="font-normal text-ds-fg-muted">
                        {t("table.column.request")}
                    </span>
                ),
                cell: ({ row }) => {
                    const request = row.original
                    return (
                        <div className="flex items-center space-x-3">
                            <div>
                                <div className="font-medium">
                                    {request.reqNumber.replace(/^REQ-/, "")}
                                </div>
                                <div className="text-ds-fg-muted text-sm">
                                    {formatRelativeTimeCompact(request.createdAt)}
                                </div>
                            </div>
                        </div>
                    )
                },
            },
            ...(sessionData?.session?.activeOrganizationId
                ? [
                      {
                          accessorKey: "requester" as const,
                          header: () => (
                              <span className="font-normal text-ds-fg-muted">
                                  {t("table.column.requester")}
                              </span>
                          ),
                          cell: ({ row }: { row: { original: UserRequest } }) => {
                              const request = row.original
                              const displayData = request.requester

                              const isGuest = displayData.id === null
                              const displayName = displayData.name
                              const dicebearAvatar = generateAvatarUrl(displayName)

                              return (
                                  <div className="flex items-center space-x-3">
                                      <div className="relative">
                                          <Avatar className="h-6 w-6">
                                              <AvatarImage
                                                  src={displayData.image || dicebearAvatar}
                                                  alt={displayName}
                                              />
                                          </Avatar>
                                          {displayData.id && (
                                              <PresenceIndicator
                                                  userId={displayData.id}
                                                  size="md"
                                                  className="absolute -right-0.5 -bottom-0.5"
                                                  showOffline
                                              />
                                          )}
                                      </div>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                      <span className="font-medium">
                                                          {displayName}
                                                      </span>
                                                      {isGuest && <GuestBadge showTooltip />}
                                                  </div>
                                              </div>
                                          </TooltipTrigger>
                                          <TooltipContent>{displayData.email}</TooltipContent>
                                      </Tooltip>
                                  </div>
                              )
                          },
                      },
                  ]
                : [
                      {
                          accessorKey: "organization" as const,
                          header: () => (
                              <span className="font-normal text-ds-fg-muted">
                                  {t("table.column.organization")}
                              </span>
                          ),
                          cell: ({ row }: { row: { original: UserRequest } }) => {
                              const request = row.original
                              const organization = getPersonalRequestOrganizationDisplay(request)
                              const displayName = organization.name
                              const displayLogo = organization.logo
                              const dicebearAvatar = generateAvatarUrl(displayName)
                              return (
                                  <div className="flex items-center space-x-3">
                                      <Avatar className="h-6 w-6">
                                          <AvatarImage
                                              src={displayLogo || dicebearAvatar}
                                              alt={displayName}
                                          />
                                      </Avatar>
                                      <div>
                                          <div className="font-medium">{displayName}</div>
                                      </div>
                                  </div>
                              )
                          },
                      },
                  ]),
            ...(sessionData?.session?.activeOrganizationId
                ? [
                      {
                          accessorKey: "assignedTo" as const,
                          header: () => (
                              <span className="font-normal text-ds-fg-muted">
                                  {t("table.column.assignedTo")}
                              </span>
                          ),
                          cell: ({ row }: { row: { original: UserRequest } }) => {
                              const request = row.original
                              const assignedTo = request.assignedTo

                              if (!assignedTo) {
                                  return <div className="text-ds-fg-muted text-sm">—</div>
                              }

                              const dicebearAvatar = generateAvatarUrl(assignedTo.name)

                              return (
                                  <div className="flex items-center space-x-3">
                                      <div className="relative">
                                          <Avatar className="h-6 w-6">
                                              <AvatarImage
                                                  src={assignedTo.image || dicebearAvatar}
                                                  alt={assignedTo.name}
                                              />
                                          </Avatar>
                                          <PresenceIndicator
                                              userId={assignedTo.id}
                                              size="md"
                                              className="absolute -right-0.5 -bottom-0.5"
                                              showOffline
                                          />
                                      </div>
                                      <Tooltip>
                                          <TooltipTrigger asChild>
                                              <div className="font-medium">{assignedTo.name}</div>
                                          </TooltipTrigger>
                                          <TooltipContent>{assignedTo.email}</TooltipContent>
                                      </Tooltip>
                                  </div>
                              )
                          },
                      },
                  ]
                : []),
            {
                accessorKey: "lifecycleStatus",
                header: () => (
                    <span className="font-normal text-ds-fg-muted">{t("table.column.status")}</span>
                ),
                cell: ({ row }) => {
                    return <RequestStatusDisplay status={row.original.lifecycleStatus} />
                },
            },
            {
                accessorKey: "fromDate",
                header: ({ column }) => {
                    return (
                        <Button
                            variant="text"
                            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                            className="!p-0 group font-normal text-ds-fg-muted"
                        >
                            {t("table.column.period")}
                            <ChevronsUpDown className="!w-4 !h-4 ml-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                        </Button>
                    )
                },
                cell: ({ row }) => {
                    const request = row.original
                    return (
                        <div className="text-ds-fg-muted text-sm">
                            {formatDateRangeShort(request.fromDate, request.toDate)}
                        </div>
                    )
                },
            },
            ...(sessionData?.session?.activeOrganizationId
                ? [
                      {
                          accessorKey: "priority" as const,
                          header: ({ column }: { column: Column<UserRequest> }) => {
                              return (
                                  <Button
                                      variant="text"
                                      onClick={() =>
                                          column.toggleSorting(column.getIsSorted() === "asc")
                                      }
                                      className="!p-0 group font-normal text-ds-fg-muted"
                                  >
                                      {t("table.column.priority")}
                                      <ChevronsUpDown className="!w-4 !h-4 ml-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                                  </Button>
                              )
                          },
                          cell: ({ row }: { row: { original: UserRequest } }) => {
                              const request = row.original
                              return <PriorityBadge priority={request.priority} />
                          },
                      },
                  ]
                : []),
            {
                id: "actions",
                enableHiding: false,
                header: () => {
                    if (!actionsRef.current.onExport || requestsCount < 1) return null

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button radius={"full"} variant="ghost" className="h-8 w-8 p-0">
                                        <span className="sr-only">
                                            {t("table.actions.tableActions")}
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
                                            ? t("table.actions.exporting")
                                            : t("table.actions.exportCsv")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
                cell: ({ row }) => {
                    const request = row.original
                    const isOrganizationView = !!sessionData?.session?.activeOrganizationId
                    const requestActionPolicy = getRequestActionPolicy({
                        scope: isOrganizationView ? "organization" : "personal",
                        currentUserRole,
                        currentUserId: sessionData?.user?.id,
                        assignedToId: request.assignedTo?.id ?? null,
                        lifecycleStatus: request.lifecycleStatus,
                    })
                    const chatRecipientDisplayName = getRequestChatRecipientName(
                        request,
                        isOrganizationView
                    )

                    return (
                        <div className="text-right">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        radius="full"
                                        variant="ghost"
                                        className="h-8 w-8 p-0"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            e.preventDefault()
                                        }}
                                    >
                                        <span className="sr-only">
                                            {t("table.actions.openMenu")}
                                        </span>
                                        <MoreVertical className="size-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    className="min-w-[220px]"
                                    align="end"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            actionsRef.current.onViewRequest(request.reqNumber)
                                        }}
                                    >
                                        <Eye className="mr-1 size-4 text-ds-fg" />
                                        {request.lifecycleStatus === "quoted"
                                            ? t("table.actions.openQuote")
                                            : t("table.actions.openRequest")}
                                    </DropdownMenuItem>
                                    {requestActionPolicy.canAssignRequest &&
                                        actionsRef.current.onAssignRequest && (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    actionsRef.current.onAssignRequest?.(request)
                                                }}
                                            >
                                                <UserPlus className="mr-1 size-4 text-ds-fg" />
                                                {request.assignedTo
                                                    ? t("table.actions.reassignRequest")
                                                    : t("table.actions.assignRequest")}
                                            </DropdownMenuItem>
                                        )}
                                    {request.conversationId && (
                                        <DropdownMenuItem
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                const href = `${basePath}/chat/${request.conversationId}`
                                                if (onNavigate) {
                                                    onNavigate(href)
                                                    return
                                                }
                                                window.location.assign(href)
                                            }}
                                        >
                                            <MessageSquare className="mr-1 size-4 text-ds-fg" />
                                            {t("table.actions.chatWith", {
                                                name: chatRecipientDisplayName,
                                            })}
                                        </DropdownMenuItem>
                                    )}
                                    {sessionData?.session?.activeOrganizationId &&
                                        actionsRef.current.onShareRequest && (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    actionsRef.current.onShareRequest?.(request)
                                                }}
                                            >
                                                <Share2 className="mr-1 size-4 text-ds-fg" />
                                                {t("table.actions.share", {
                                                    defaultValue: "Share...",
                                                })}
                                            </DropdownMenuItem>
                                        )}
                                    {sessionData?.session?.activeOrganizationId &&
                                        actionsRef.current.onToggleFavoriteRequest && (
                                            <DropdownMenuItem
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    actionsRef.current.onToggleFavoriteRequest?.(
                                                        request
                                                    )
                                                }}
                                            >
                                                <Star
                                                    className="mr-1 size-4 text-ds-fg"
                                                    fill={
                                                        favoriteRequestIds.has(request.id)
                                                            ? "currentColor"
                                                            : "none"
                                                    }
                                                />
                                                {favoriteRequestIds.has(request.id)
                                                    ? t("table.actions.removeFavorite", {
                                                          defaultValue: "Remove favorite",
                                                      })
                                                    : t("table.actions.addFavorite", {
                                                          defaultValue: "Add favorite",
                                                      })}
                                            </DropdownMenuItem>
                                        )}
                                    <DropdownMenuItem
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            actionsRef.current.onDownloadPdf(request)
                                        }}
                                    >
                                        <CloudDownload className="mr-1 size-4 text-ds-fg" />
                                        {t("table.actions.download")}
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    )
                },
            },
        ],
        [
            sessionData?.session?.activeOrganizationId,
            sessionData?.user?.id,
            currentUserRole,
            canExport,
            isExporting,
            requestsCount,
            favoriteRequestIds,
            basePath,
            onNavigate,
            t,
        ]
    )
}
