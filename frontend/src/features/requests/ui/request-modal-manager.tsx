import { useCallback, useState } from "react"
import { useTranslation } from "react-i18next"
import type { SessionResponse } from "@/entities/session"
import { showErrorToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { useDeleteDraft } from "../api/request-draft.mutations"
import {
    useCancelRequest,
    useRejectRequest,
    useValidateDraft,
} from "../api/request-status.mutations"
import {
    createRequestScopeKey,
    type RequestScopeKey,
    type RequestsListScope,
    useRequestByNumber,
} from "../api/requests.api"
import { getActiveModalRequestData } from "../lib/request-modal-data"
import { useRequestSheet } from "../model/hooks/use-request-sheet"
import { RequestModal } from "./request-modal"
import { RequestRejectionDialog } from "./request-rejection-dialog"
import type { ShareRequestSource } from "./share-request-dialog"

interface RequestModalManagerProps {
    sessionData: SessionResponse
    defaultScope: RequestsListScope
    currentUserRole: string | null
    onNavigate?: (href: string) => void
    onShareRequest?: (request: ShareRequestSource) => void
}

function createDefaultRequestModalScope(
    sessionData: SessionResponse,
    defaultScope: RequestsListScope
): RequestScopeKey | null {
    if (defaultScope === "organization") {
        return createRequestScopeKey({
            scope: "organization",
            organizationId: sessionData.session?.activeOrganizationId,
        })
    }

    return createRequestScopeKey({ scope: "personal", userId: sessionData.user?.id })
}

export function RequestModalManager({
    sessionData,
    defaultScope,
    currentUserRole,
    onNavigate,
    onShareRequest,
}: RequestModalManagerProps) {
    const { openRequestNumber, isOpen, closeRequest, fromTeamChat, teamChatOrganizationId } =
        useRequestSheet()
    const requestScope = fromTeamChat
        ? createRequestScopeKey({
              scope: "organization",
              organizationId: teamChatOrganizationId,
          })
        : createDefaultRequestModalScope(sessionData, defaultScope)

    if (!requestScope) {
        if (!isOpen) return null

        if (fromTeamChat) {
            throw new Response("Organization request scope is missing", { status: 404 })
        }

        throw new Response("Request scope is missing", { status: 404 })
    }

    return (
        <ResolvedRequestModalManager
            sessionData={sessionData}
            currentUserRole={currentUserRole}
            requestScope={requestScope}
            openRequestNumber={openRequestNumber}
            isOpen={isOpen}
            closeRequest={closeRequest}
            fromTeamChat={fromTeamChat}
            onNavigate={onNavigate}
            onShareRequest={onShareRequest}
        />
    )
}

interface ResolvedRequestModalManagerProps {
    sessionData: SessionResponse
    currentUserRole: string | null
    requestScope: RequestScopeKey
    openRequestNumber: string | null
    isOpen: boolean
    closeRequest: () => void
    fromTeamChat: boolean
    onNavigate?: (href: string) => void
    onShareRequest?: (request: ShareRequestSource) => void
}

interface SubmitLoadingState {
    requestContextKey: string
    isLoading: boolean
}

function ResolvedRequestModalManager({
    sessionData,
    currentUserRole,
    requestScope,
    openRequestNumber,
    isOpen,
    closeRequest,
    fromTeamChat,
    onNavigate,
    onShareRequest,
}: ResolvedRequestModalManagerProps) {
    const { t } = useTranslation("requests")
    const requestContextKey = [
        isOpen ? "open" : "closed",
        openRequestNumber ?? "",
        requestScope.scope,
        requestScope.scopeId,
    ].join(":")
    const [editModeContextKey, setEditModeContextKey] = useState<string | null>(null)
    const [submitLoadingState, setSubmitLoadingState] = useState<SubmitLoadingState | null>(null)
    const [rejectionDialogContextKey, setRejectionDialogContextKey] = useState<string | null>(null)
    const requestQuery = useRequestByNumber(openRequestNumber ?? "", requestScope, {
        enabled: isOpen && !!openRequestNumber,
    })
    const refetchActiveRequest = useCallback(() => {
        void requestQuery.refetch()
    }, [requestQuery.refetch])
    const isEditMode = editModeContextKey === requestContextKey
    const isSubmitLoading =
        submitLoadingState?.requestContextKey === requestContextKey
            ? submitLoadingState.isLoading
            : false
    const activeRequestData = isOpen
        ? getActiveModalRequestData(requestQuery.data ?? null, openRequestNumber)
        : null

    const cancelRequestMutation = useCancelRequest(requestScope)
    const rejectRequestMutation = useRejectRequest(requestScope)
    const validateDraftMutation = useValidateDraft(requestScope)
    const deleteDraftMutation = useDeleteDraft(requestScope)

    const setEditModeForActiveRequest = useCallback(
        (editMode: boolean) => {
            setEditModeContextKey(editMode ? requestContextKey : null)
        },
        [requestContextKey]
    )

    const setSubmitLoadingForActiveRequest = useCallback(
        (isLoading: boolean) => {
            setSubmitLoadingState({ requestContextKey, isLoading })
        },
        [requestContextKey]
    )

    const confirmCancellation = async () => {
        if (!activeRequestData) return

        cancelRequestMutation.mutate(activeRequestData.id, {
            onSuccess: () => {
                showSuccessToast(t("toast.requestCanceled"))
                closeRequest()
            },
            onError: () => {
                showRetryErrorToast(t("toast.failedToCancel"), {
                    onRetry: confirmCancellation,
                })
            },
        })
    }

    const openRejectionDialog = () => {
        if (!activeRequestData) return

        setRejectionDialogContextKey(requestContextKey)
    }

    const confirmRejection = (reason: string) => {
        if (!activeRequestData) return

        rejectRequestMutation.mutate(
            { requestId: activeRequestData.id, reason },
            {
                onSuccess: () => {
                    showSuccessToast(t("toast.requestRejected"))
                    setRejectionDialogContextKey(null)
                    closeRequest()
                },
                onError: () => {
                    showErrorToast(t("toast.failedToReject"))
                },
            }
        )
    }

    const confirmValidation = () => {
        if (!activeRequestData) return

        validateDraftMutation.mutate(activeRequestData.id, {
            onSuccess: () => {
                showSuccessToast(t("toast.draftValidated"))
                closeRequest()
            },
            onError: () => {
                showRetryErrorToast(t("toast.failedToValidate"), {
                    onRetry: confirmValidation,
                })
            },
        })
    }

    const confirmDiscard = () => {
        if (!activeRequestData) return

        deleteDraftMutation.mutate(activeRequestData.id, {
            onSuccess: () => {
                showSuccessToast(t("toast.draftDiscarded"))
                closeRequest()
            },
            onError: () => {
                showRetryErrorToast(t("toast.failedToDiscard"), {
                    onRetry: confirmDiscard,
                })
            },
        })
    }

    const closeModal = () => {
        closeRequest()
        setSubmitLoadingState(null)
        setRejectionDialogContextKey(null)
        setEditModeContextKey(null)
    }

    return (
        <>
            <RequestModal
                isOpen={isOpen}
                requestNumber={openRequestNumber ?? undefined}
                isEditMode={isEditMode}
                isCancelLoading={cancelRequestMutation.isPending || rejectRequestMutation.isPending}
                isSubmitLoading={isSubmitLoading}
                isValidateLoading={validateDraftMutation.isPending}
                isDiscardLoading={deleteDraftMutation.isPending}
                requestData={activeRequestData}
                isRequestLoading={requestQuery.isLoading}
                requestError={requestQuery.error}
                onRequestRefetch={refetchActiveRequest}
                sessionData={sessionData}
                requestScope={requestScope}
                currentUserRole={currentUserRole}
                hideShareToTeamChatButton={fromTeamChat}
                onClose={closeModal}
                onEditModeChange={setEditModeForActiveRequest}
                onCancelConfirm={confirmCancellation}
                onRejectConfirm={openRejectionDialog}
                onValidateConfirm={confirmValidation}
                onDiscardConfirm={confirmDiscard}
                onSubmitLoadingChange={setSubmitLoadingForActiveRequest}
                onNavigate={onNavigate}
                onShareRequest={onShareRequest}
            />
            {rejectionDialogContextKey === requestContextKey && activeRequestData && (
                <RequestRejectionDialog
                    isOpen={true}
                    onClose={() => setRejectionDialogContextKey(null)}
                    request={activeRequestData}
                    onConfirm={confirmRejection}
                    isLoading={rejectRequestMutation.isPending}
                />
            )}
        </>
    )
}
