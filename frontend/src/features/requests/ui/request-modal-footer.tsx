import { Link } from "@tanstack/react-router"
import type { MouseEvent, ReactNode, RefObject } from "react"
import { useTranslation } from "react-i18next"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { Spinner } from "@/shared/ui/spinner"
import { getRequestActionPolicy, type RequestActionScope } from "../lib/request-action-policy"
import type { RequestLifecycleStatus } from "../model/request"
import { CancelRequestDialog } from "./cancel-request-dialog"
import type { RequestDetailsRef } from "./request-details"

interface RequestModalFooterProps {
    isEditMode: boolean
    currentRequestStatus?: RequestLifecycleStatus
    requestScope: RequestActionScope
    requestNumber?: string
    isCancelLoading: boolean
    isSubmitLoading?: boolean
    isValidateLoading?: boolean
    isDiscardLoading?: boolean
    hasSelectedServices: boolean
    requestDetailsRef: RefObject<RequestDetailsRef | null>
    currentUserRole?: string | null
    currentUserId?: string
    assignedToId?: string
    hasLegalDocuments: boolean
    isLegalDocumentsLoading: boolean
    legalsSettingsHref: string | null
    showLegalsRequiredError: boolean
    onLegalsRequiredErrorChange: (show: boolean) => void
    onEditModeChange: (editMode: boolean) => void
    onCancelConfirm: () => void
    onRejectConfirm: () => void
    onValidateConfirm?: () => void
    onDiscardConfirm?: () => void
}

const FOOTER_CLASS_NAME =
    "flex shrink-0 flex-col gap-3 bg-gradient-to-b from-transparent via-10% via-ds-surface to-ds-surface px-8 pt-2 pb-4 opacity-100 transition-all delay-150 duration-150 ease-in-out"

export function RequestModalFooter({
    isEditMode,
    currentRequestStatus,
    requestScope,
    requestNumber,
    isCancelLoading,
    isSubmitLoading = false,
    isValidateLoading = false,
    isDiscardLoading = false,
    hasSelectedServices,
    requestDetailsRef,
    currentUserRole,
    currentUserId,
    assignedToId,
    hasLegalDocuments,
    isLegalDocumentsLoading,
    legalsSettingsHref,
    showLegalsRequiredError,
    onLegalsRequiredErrorChange,
    onEditModeChange,
    onCancelConfirm,
    onRejectConfirm,
    onValidateConfirm,
    onDiscardConfirm,
}: RequestModalFooterProps) {
    const { t } = useTranslation("requests")
    const requestActionPolicy = currentRequestStatus
        ? getRequestActionPolicy({
              scope: requestScope,
              currentUserRole,
              currentUserId,
              assignedToId: assignedToId ?? null,
              lifecycleStatus: currentRequestStatus,
          })
        : null
    const hasPermission = requestActionPolicy?.canManageRequest ?? false
    const renderEditModeFooter = (): ReactNode => (
        <>
            <Button
                variant="solid"
                radius="full"
                size="xl"
                onClick={() => requestDetailsRef.current?.submitQuote()}
                disabled={isSubmitLoading || !hasSelectedServices}
            >
                {isSubmitLoading ? (
                    <div className="flex items-center gap-2">
                        <Spinner className="h-4 w-4" />
                        {t("modalFooter.submittingQuote")}
                    </div>
                ) : (
                    t("modalFooter.submitQuote")
                )}
            </Button>
            <Button variant="ghost" radius="full" size="xl" onClick={() => onEditModeChange(false)}>
                {t("modalFooter.cancelEdit")}
            </Button>
        </>
    )

    const renderUserCancelFooter = (): ReactNode => (
        <CancelRequestDialog
            requestNumber={requestNumber}
            isCancelLoading={isCancelLoading}
            onConfirm={onCancelConfirm}
            variant="cancel"
        />
    )

    const handleAnswerWithQuoteClick = (e: MouseEvent<HTMLButtonElement>) => {
        e.preventDefault()
        e.stopPropagation()
        if (isLegalDocumentsLoading) return
        if (!hasLegalDocuments) {
            onLegalsRequiredErrorChange(true)
            return
        }
        onLegalsRequiredErrorChange(false)
        onEditModeChange(true)
    }

    const renderOrganizationFooter = (): ReactNode => {
        if (!hasPermission) {
            return null
        }

        return (
            <>
                {showLegalsRequiredError && (
                    <Alert variant="destructive">
                        <AlertDescription>
                            {t("modalFooter.legalsRequired")}
                            {legalsSettingsHref && (
                                <>
                                    {" "}
                                    <Link
                                        to={legalsSettingsHref}
                                        className="font-medium underline underline-offset-2"
                                    >
                                        {t("modalFooter.goToLegals")}
                                    </Link>
                                </>
                            )}
                        </AlertDescription>
                    </Alert>
                )}
                <Button
                    variant="solid"
                    radius="full"
                    size="xl"
                    onClick={handleAnswerWithQuoteClick}
                >
                    {t("modalFooter.answerWithQuote")}
                </Button>
                <CancelRequestDialog
                    requestNumber={requestNumber}
                    isCancelLoading={isCancelLoading}
                    onConfirm={onRejectConfirm}
                    variant="reject"
                />
            </>
        )
    }

    const renderDraftFooter = (): ReactNode => {
        if (!hasPermission) {
            return null
        }

        return (
            <>
                <Button
                    variant="solid"
                    radius="full"
                    size="xl"
                    onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onValidateConfirm?.()
                    }}
                    disabled={isValidateLoading}
                >
                    {isValidateLoading ? (
                        <div className="flex items-center gap-2">
                            <Spinner className="h-4 w-4" />
                            {t("modalFooter.validatingDraft")}
                        </div>
                    ) : (
                        t("modalFooter.validateDraft")
                    )}
                </Button>
                <CancelRequestDialog
                    requestNumber={requestNumber}
                    isCancelLoading={isDiscardLoading}
                    onConfirm={() => onDiscardConfirm?.()}
                    variant="discard"
                />
            </>
        )
    }

    const renderFooter = (): ReactNode => {
        if (isEditMode) {
            return renderEditModeFooter()
        }

        const isOrganizationView = requestScope === "organization"
        const canAnswerWithQuote = currentRequestStatus === "open"

        if (currentRequestStatus === "draft" && isOrganizationView) {
            return renderDraftFooter()
        }

        if (currentRequestStatus === "open") {
            if (!isOrganizationView) {
                return renderUserCancelFooter()
            }
            return renderOrganizationFooter()
        }

        if (canAnswerWithQuote && isOrganizationView) {
            return renderOrganizationFooter()
        }

        return null
    }

    const footerContent = renderFooter()
    if (!footerContent) return null

    return <div className={FOOTER_CLASS_NAME}>{footerContent}</div>
}
