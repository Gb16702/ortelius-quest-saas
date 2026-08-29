import { Link } from "@tanstack/react-router"
import {
    CloudDownload,
    MessageSquare,
    MoreHorizontal,
    Share2,
    Star,
    UserPlus,
    X,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react"
import { useFavorites, useFavoriteToggle } from "@/entities/favorite"
import { useLegalDocumentsList } from "@/entities/legal-document"
import { useOrgOptional } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import { Button } from "@/shared/ui/button"
import { ButtonGroup } from "@/shared/ui/button-group"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/shared/ui/sheet"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import {
    useAssignRequest,
    useReassignRequest,
    useUnassignRequest,
} from "../api/request-assignment.mutations"
import { useRequestAssignableMembers } from "../api/request-member-lookup.query"
import type { RequestScopeKey } from "../api/requests.api"
import { getRequestActionPolicy, type RequestActionPolicy } from "../lib/request-action-policy"
import { type AssignDialogMember, toAssignDialogMembers } from "../lib/request-assignment"
import { createRequestOptimisticFavorite } from "../lib/request-favorite"
import { downloadRequestPdfWithToast } from "../lib/request-pdf-download"
import type { RequestData } from "../model/request"
import { initialRequestModalState, requestModalReducer } from "../model/request-modal.reducer"
import { AssignRequestDialog } from "./assign-request-dialog"
import { RequestDetails, type RequestDetailsRef } from "./request-details"
import { RequestModalFooter } from "./request-modal-footer"
import type { ShareRequestSource } from "./share-request-dialog"

interface RequestModalProps {
    isOpen: boolean
    requestNumber?: string
    isEditMode: boolean
    isCancelLoading: boolean
    isSubmitLoading?: boolean
    isValidateLoading?: boolean
    isDiscardLoading?: boolean
    requestData: RequestData | null
    isRequestLoading: boolean
    requestError: Error | null
    onRequestRefetch: () => void
    sessionData: SessionResponse
    requestScope: RequestScopeKey
    currentUserRole?: string | null
    hideChatButton?: boolean
    hideShareToTeamChatButton?: boolean
    onClose: () => void
    onEditModeChange: (editMode: boolean) => void
    onCancelConfirm: () => void
    onRejectConfirm: () => void
    onValidateConfirm?: () => void
    onDiscardConfirm?: () => void
    onSubmitLoadingChange?: (loading: boolean) => void
    onNavigate?: (href: string) => void
    onShareRequest?: (request: ShareRequestSource) => void
}

interface UseRequestModalAssignmentActionsOptions {
    requestScope: RequestScopeKey
    activeRequestData: RequestData | null
    requestActionPolicy: RequestActionPolicy | null
    members: AssignDialogMember[]
    currentUserId?: string
    closeAssignDialog: () => void
}

function useRequestModalAssignmentActions({
    requestScope,
    activeRequestData,
    requestActionPolicy,
    members,
    currentUserId,
    closeAssignDialog,
}: UseRequestModalAssignmentActionsOptions) {
    const assignRequestMutation = useAssignRequest(requestScope)
    const reassignRequestMutation = useReassignRequest(requestScope)
    const unassignRequestMutation = useUnassignRequest(requestScope)

    const assignMember = useCallback(
        async (memberId: string) => {
            if (!activeRequestData) return
            if (!requestActionPolicy?.canAssignRequest) return

            const isReassigning = !!activeRequestData.assignedTo
            const mutation = isReassigning ? reassignRequestMutation : assignRequestMutation
            const selectedMember = members.find((member) => member.id === memberId)

            mutation.mutate(
                {
                    requestId: activeRequestData.id,
                    memberId,
                    memberName: selectedMember?.name,
                    memberEmail: selectedMember?.email,
                    memberRole: selectedMember?.role,
                    memberImage: selectedMember?.image,
                    currentUserId,
                },
                {
                    onSuccess: closeAssignDialog,
                }
            )
        },
        [
            activeRequestData,
            requestActionPolicy?.canAssignRequest,
            reassignRequestMutation,
            assignRequestMutation,
            members,
            currentUserId,
            closeAssignDialog,
        ]
    )

    const unassignMember = useCallback(async () => {
        if (!activeRequestData) return
        if (!requestActionPolicy?.canAssignRequest) return

        unassignRequestMutation.mutate(activeRequestData.id, {
            onSuccess: closeAssignDialog,
        })
    }, [
        activeRequestData,
        requestActionPolicy?.canAssignRequest,
        unassignRequestMutation,
        closeAssignDialog,
    ])

    return {
        assignMember,
        unassignMember,
        isAssigning:
            assignRequestMutation.isPending ||
            reassignRequestMutation.isPending ||
            unassignRequestMutation.isPending,
    }
}

interface RequestModalActionsProps {
    activeRequestData: RequestData | null
    chatBasePath: string
    chatPartnerName: string
    hideChatButton: boolean
    hideShareToTeamChatButton: boolean
    isDownloading: boolean
    isFavoriteActionDisabled: boolean
    isRequestFavorited: boolean
    isOrganizationUser: boolean
    requestActionPolicy: RequestActionPolicy | null
    onClose: () => void
    onDownloadPdf: () => void
    onOpenAssignDialog: () => void
    onShareRequest?: () => void
    onToggleFavoriteRequest: () => void
}

function RequestModalActions({
    activeRequestData,
    chatBasePath,
    chatPartnerName,
    hideChatButton,
    hideShareToTeamChatButton,
    isDownloading,
    isFavoriteActionDisabled,
    isRequestFavorited,
    isOrganizationUser,
    requestActionPolicy,
    onClose,
    onDownloadPdf,
    onOpenAssignDialog,
    onShareRequest,
    onToggleFavoriteRequest,
}: RequestModalActionsProps) {
    const chatHref = activeRequestData?.conversationId
        ? `${chatBasePath}/chat/${activeRequestData.conversationId}`
        : null

    return (
        <div className="pointer-events-none absolute top-[34px] right-8 z-10">
            <ButtonGroup className="pointer-events-auto [&_button:hover]:border-ds-surface-border">
                <DropdownMenu>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                                <Button radius="full" variant="outline" size="icon">
                                    <MoreHorizontal className="size-4" />
                                </Button>
                            </DropdownMenuTrigger>
                        </TooltipTrigger>
                        <TooltipContent>Actions</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="end">
                        {!hideChatButton && chatHref && (
                            <DropdownMenuItem asChild>
                                <Link to={chatHref}>
                                    <MessageSquare className="size-4" />
                                    Chat with {chatPartnerName}
                                </Link>
                            </DropdownMenuItem>
                        )}
                        {requestActionPolicy?.canAssignRequest && activeRequestData && (
                            <DropdownMenuItem onClick={onOpenAssignDialog}>
                                <UserPlus className="size-4" />
                                {activeRequestData.assignedTo
                                    ? "Reassign request"
                                    : "Assign request"}
                            </DropdownMenuItem>
                        )}
                        {isOrganizationUser &&
                            activeRequestData &&
                            !hideShareToTeamChatButton &&
                            onShareRequest && (
                                <DropdownMenuItem onClick={onShareRequest}>
                                    <Share2 className="size-4" />
                                    Share...
                                </DropdownMenuItem>
                            )}
                        {isOrganizationUser && activeRequestData && (
                            <DropdownMenuItem
                                onClick={onToggleFavoriteRequest}
                                disabled={isFavoriteActionDisabled}
                            >
                                <Star
                                    className="size-4"
                                    fill={isRequestFavorited ? "currentColor" : "none"}
                                />
                                {isRequestFavorited ? "Remove favorite" : "Add favorite"}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                            onClick={onDownloadPdf}
                            disabled={!activeRequestData || isDownloading}
                        >
                            <CloudDownload className="size-4" />
                            Download PDF
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button radius="full" variant="outline" size="icon" onClick={onClose}>
                            <X className="size-4" />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>Close</TooltipContent>
                </Tooltip>
            </ButtonGroup>
        </div>
    )
}

export function RequestModal({
    isOpen,
    requestNumber,
    isEditMode,
    isCancelLoading,
    isSubmitLoading = false,
    isValidateLoading = false,
    isDiscardLoading = false,
    requestData,
    isRequestLoading,
    requestError,
    onRequestRefetch,
    sessionData,
    requestScope,
    currentUserRole,
    hideChatButton = false,
    hideShareToTeamChatButton = false,
    onClose,
    onEditModeChange,
    onCancelConfirm,
    onRejectConfirm,
    onValidateConfirm,
    onDiscardConfirm,
    onSubmitLoadingChange,
    onShareRequest,
}: RequestModalProps) {
    const requestDetailsRef = useRef<RequestDetailsRef>(null)
    const orgCtx = useOrgOptional()
    const chatBasePath = orgCtx ? `/org/${orgCtx.meta.slug}` : "/me"
    const [modalState, dispatch] = useReducer(requestModalReducer, initialRequestModalState)
    const activeRequestData = requestData
    const requestContextKey = [requestNumber ?? "", requestScope.scope, requestScope.scopeId].join(
        ":"
    )
    const isAssignDialogOpenForActiveRequest =
        modalState.isAssignDialogOpen && modalState.assignDialogContextKey === requestContextKey
    const hasSelectedServicesForActiveRequest =
        modalState.hasSelectedServicesContextKey === requestContextKey &&
        modalState.hasSelectedServices

    const organizationId =
        requestScope.scope === "organization"
            ? requestScope.scopeId
            : sessionData?.session?.activeOrganizationId
    const isOrganizationUser = requestScope.scope === "organization"
    const membersQuery = useRequestAssignableMembers(organizationId || "", {
        enabled: !!organizationId && isOpen && isAssignDialogOpenForActiveRequest,
    })

    const legalDocumentsQuery = useLegalDocumentsList(
        isOpen && organizationId ? organizationId : null
    )
    const favoriteOrganizationId =
        isOpen && isOrganizationUser ? (organizationId ?? undefined) : undefined
    const favoritesQuery = useFavorites(favoriteOrganizationId)
    const favoriteToggleMutation = useFavoriteToggle()
    const hasLegalDocuments = (legalDocumentsQuery.data?.documents?.length ?? 0) > 0
    const legalsSettingsHref = orgCtx ? `/org/${orgCtx.meta.slug}/settings/legals` : null

    const [showLegalsRequiredError, setShowLegalsRequiredError] = useState(false)
    const requestActionPolicy = activeRequestData
        ? getRequestActionPolicy({
              scope: requestScope.scope,
              currentUserRole,
              currentUserId: sessionData?.user?.id,
              assignedToId: activeRequestData.assignedTo?.id ?? null,
              lifecycleStatus: activeRequestData.lifecycleStatus,
          })
        : null

    useEffect(() => {
        if (!isOpen || isEditMode) setShowLegalsRequiredError(false)
    }, [isOpen, isEditMode])

    useEffect(() => {
        if (isOpen) return

        dispatch({ type: "CLEAR_REQUEST_CONTEXT" })
    }, [isOpen])

    useEffect(() => {
        if (hasLegalDocuments) setShowLegalsRequiredError(false)
    }, [hasLegalDocuments])

    const members = useMemo(() => toAssignDialogMembers(membersQuery.data), [membersQuery.data])
    const closeAssignDialog = useCallback(() => {
        dispatch({ type: "CLOSE_ASSIGN_DIALOG" })
    }, [])
    const {
        assignMember,
        unassignMember,
        isAssigning: isAssignmentMutationPending,
    } = useRequestModalAssignmentActions({
        requestScope,
        activeRequestData,
        requestActionPolicy,
        members,
        currentUserId: sessionData?.user?.id,
        closeAssignDialog,
    })

    const updateSelectedServicesStatus = useCallback(
        (hasSelectedServices: boolean) => {
            dispatch({
                type: "SET_HAS_SELECTED_SERVICES",
                hasSelectedServices,
                requestContextKey,
            })
        },
        [requestContextKey]
    )

    const openAssignDialog = useCallback(() => {
        if (!activeRequestData) return
        if (!requestActionPolicy?.canAssignRequest) return

        dispatch({ type: "OPEN_ASSIGN_DIALOG", requestContextKey })
    }, [activeRequestData, requestActionPolicy?.canAssignRequest, requestContextKey])

    const updateOpenState = (open: boolean) => {
        if (!open) {
            dispatch({ type: "CLEAR_REQUEST_CONTEXT" })
            onClose()
            onEditModeChange(false)
        }
    }

    const downloadPdf = async () => {
        if (!activeRequestData || modalState.isDownloading) return

        dispatch({ type: "START_DOWNLOAD" })

        await downloadRequestPdfWithToast({
            requestId: activeRequestData.id,
            requestNumber: activeRequestData.reqNumber,
        })

        setTimeout(() => {
            dispatch({ type: "FINISH_DOWNLOAD" })
        }, 3000)
    }

    const openShareRequestDialog = useCallback(() => {
        if (!activeRequestData) return

        onShareRequest?.({
            id: activeRequestData.id,
            reqNumber: activeRequestData.reqNumber,
        })
    }, [activeRequestData, onShareRequest])

    const isRequestFavorited = useMemo(
        () =>
            (favoritesQuery.data?.favorites ?? []).some(
                (favorite) =>
                    favorite.entityType === "request" && favorite.entityId === activeRequestData?.id
            ),
        [activeRequestData?.id, favoritesQuery.data?.favorites]
    )
    const toggleRequestFavorite = useCallback(() => {
        if (!activeRequestData || !favoriteOrganizationId) return

        favoriteToggleMutation.mutate({
            entityType: "request",
            entityId: activeRequestData.id,
            isFavorited: isRequestFavorited,
            organizationId: favoriteOrganizationId,
            optimisticFavorite: createRequestOptimisticFavorite(
                activeRequestData,
                favoriteOrganizationId
            ),
        })
    }, [activeRequestData, favoriteOrganizationId, favoriteToggleMutation, isRequestFavorited])

    const chatPartnerName = isOrganizationUser
        ? activeRequestData?.requester?.name || "Requester"
        : activeRequestData?.organization?.name || "Organization"

    return (
        <Sheet open={isOpen} onOpenChange={updateOpenState}>
            <SheetContent
                side="right"
                className="!h-[calc(100vh-1.5rem)] bottom-3 m-3 rounded-lg bg-ds-surface p-0 [box-shadow:var(--shadow-bottom-sheet)]"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <SheetDescription className="sr-only">
                    View request details, messages, assignment, documents, and actions.
                </SheetDescription>
                <RequestModalActions
                    activeRequestData={activeRequestData}
                    chatBasePath={chatBasePath}
                    chatPartnerName={chatPartnerName}
                    hideChatButton={hideChatButton}
                    hideShareToTeamChatButton={hideShareToTeamChatButton}
                    isDownloading={modalState.isDownloading}
                    isFavoriteActionDisabled={
                        favoritesQuery.isLoading || favoriteToggleMutation.isPending
                    }
                    isRequestFavorited={isRequestFavorited}
                    isOrganizationUser={isOrganizationUser}
                    requestActionPolicy={requestActionPolicy}
                    onClose={() => updateOpenState(false)}
                    onDownloadPdf={downloadPdf}
                    onOpenAssignDialog={openAssignDialog}
                    onShareRequest={openShareRequestDialog}
                    onToggleFavoriteRequest={toggleRequestFavorite}
                />
                <div className="flex h-full flex-col">
                    <div className="flex-1 overflow-y-auto overscroll-contain p-6 px-8">
                        <div className="flex items-center justify-between py-4">
                            <SheetTitle className="font-semibold text-ds-fg text-lg leading-[1.4] tracking-tight">
                                {activeRequestData?.reqNumber || requestNumber || "Request details"}
                            </SheetTitle>
                        </div>
                        {requestNumber && (
                            <RequestDetails
                                ref={requestDetailsRef}
                                requestData={activeRequestData}
                                isRequestLoading={isRequestLoading}
                                requestError={requestError}
                                onRequestRefetch={onRequestRefetch}
                                requestScope={requestScope}
                                isEditMode={isEditMode}
                                onEditModeChange={onEditModeChange}
                                onClose={onClose}
                                onSubmitLoadingChange={onSubmitLoadingChange}
                                onHasSelectedServicesChange={updateSelectedServicesStatus}
                                onOpenAssignDialog={openAssignDialog}
                                isOrganizationView={isOrganizationUser}
                                currentUserRole={currentUserRole}
                                currentUserId={sessionData?.user?.id}
                            />
                        )}
                    </div>
                    <RequestModalFooter
                        isEditMode={isEditMode}
                        currentRequestStatus={activeRequestData?.lifecycleStatus}
                        requestScope={requestScope.scope}
                        requestNumber={activeRequestData?.reqNumber || requestNumber}
                        isCancelLoading={isCancelLoading}
                        isSubmitLoading={isSubmitLoading}
                        isValidateLoading={isValidateLoading}
                        isDiscardLoading={isDiscardLoading}
                        hasSelectedServices={hasSelectedServicesForActiveRequest}
                        requestDetailsRef={requestDetailsRef}
                        currentUserRole={currentUserRole}
                        currentUserId={sessionData?.user?.id}
                        assignedToId={activeRequestData?.assignedTo?.id}
                        hasLegalDocuments={hasLegalDocuments}
                        isLegalDocumentsLoading={legalDocumentsQuery.isLoading}
                        legalsSettingsHref={legalsSettingsHref}
                        showLegalsRequiredError={showLegalsRequiredError}
                        onLegalsRequiredErrorChange={setShowLegalsRequiredError}
                        onEditModeChange={onEditModeChange}
                        onCancelConfirm={onCancelConfirm}
                        onRejectConfirm={onRejectConfirm}
                        onValidateConfirm={onValidateConfirm}
                        onDiscardConfirm={onDiscardConfirm}
                    />
                </div>
            </SheetContent>

            {isAssignDialogOpenForActiveRequest && activeRequestData && (
                <AssignRequestDialog
                    key={`${activeRequestData.id}-${activeRequestData.assignedTo?.id || "unassigned"}`}
                    isOpen={true}
                    onClose={closeAssignDialog}
                    members={members}
                    currentAssignee={activeRequestData.assignedTo}
                    currentUserId={sessionData?.user?.id}
                    requestNumber={activeRequestData.reqNumber}
                    isLoading={isAssignmentMutationPending}
                    isLoadingMembers={membersQuery.isLoading}
                    onAssign={assignMember}
                    onUnassign={unassignMember}
                />
            )}
        </Sheet>
    )
}
