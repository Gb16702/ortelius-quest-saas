import { Calendar, ExternalLink, FileText, Info, Loader, User, UserPlus } from "lucide-react"
import { type ReactNode, type Ref, useCallback, useEffect, useImperativeHandle } from "react"
import { GuestBadge } from "@/entities/member"
import { RequestStatusDisplay } from "@/entities/request"
import { CategoryIcon } from "@/entities/service-type"
import { formatDateRange } from "@/shared/lib/date"
import { Button } from "@/shared/ui/button"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { FieldError } from "@/shared/ui/field"
import { SelectableCard } from "@/shared/ui/selectable-card"
import { Textarea } from "@/shared/ui/textarea"
import { showErrorToast, showRetryErrorToast } from "@/shared/ui/toasts"
import { useSubmitQuote } from "../api/request-quote.mutations"
import type { RequestScopeKey } from "../api/requests.api"
import { getQuoteSubmissionError, hasIncludedQuoteServices } from "../lib/quote-submission"
import { getRequestActionPolicy } from "../lib/request-action-policy"
import { hasCargoDetails, shouldShowQuoteView } from "../lib/request-detail-rules"
import { useLegalDocumentsSelection } from "../model/hooks/use-legal-documents-selection"
import { useQuoteData } from "../model/hooks/use-quote-data"
import type { Category, RequestData, Service } from "../model/request"
import { CargoDetailsDisplay } from "./cargo-details-display"
import { InvoiceDetailView } from "./invoices/invoice-detail-view"
import { LegalDocumentsSelector } from "./legal-documents-selector/legal-documents-selector"
import { QuoteTotals } from "./quote-totals"
import { QuoteDetailView } from "./quotes/quote-detail-view"
import { RequestDetailsSkeleton } from "./request-details-skeleton"
import { ServicePricing } from "./service-pricing"

interface RequestDetailsProps {
    requestData: RequestData | null
    isRequestLoading: boolean
    requestError: Error | null
    onRequestRefetch: () => void
    requestScope: RequestScopeKey
    isEditMode?: boolean
    onEditModeChange?: (editMode: boolean) => void
    onClose?: () => void
    onSubmitLoadingChange?: (loading: boolean) => void
    onHasSelectedServicesChange?: (hasSelected: boolean) => void
    onOpenAssignDialog?: () => void
    isOrganizationView?: boolean
    currentUserRole?: string | null
    currentUserId?: string | null
}

export interface RequestDetailsRef {
    submitQuote: () => Promise<void>
}

interface RequestDetailContainerProps {
    title?: string
    description?: string
    children?: ReactNode
}

const RequestDetailContainer = ({ children }: RequestDetailContainerProps) => {
    return (
        <div className={"w-full rounded-sm"}>
            <div className={"flex flex-col gap-y-6"}>{children}</div>
        </div>
    )
}

export const RequestDetails = ({
    requestData,
    isRequestLoading,
    requestError,
    onRequestRefetch,
    requestScope,
    isEditMode = false,
    onEditModeChange,
    onClose,
    onSubmitLoadingChange,
    onHasSelectedServicesChange,
    onOpenAssignDialog,
    isOrganizationView = false,
    currentUserRole,
    currentUserId,
    ref,
}: RequestDetailsProps & { ref?: Ref<RequestDetailsRef> }) => {
    const submitQuoteMutation = useSubmitQuote(requestScope)

    useEffect(() => {
        if (!requestError) return
        showRetryErrorToast("Failed to load request", {
            onRetry: onRequestRefetch,
        })
    }, [requestError, onRequestRefetch])

    const {
        quoteData,
        setQuoteData,
        priceSuggestions,
        toggleCategory,
        toggleService,
        updateServicePrice,
        updateCargoDetail,
        updateVatRate,
    } = useQuoteData({
        requestData: requestData ?? null,
        isEditMode,
    })

    const {
        documents: legalDocuments,
        isLoading: isLoadingLegalDocuments,
        onSelectedIdsChange: handleLegalDocumentIdsChange,
    } = useLegalDocumentsSelection({
        organizationId: requestData?.receiverOrganizationId ?? null,
        isEditMode,
        setQuoteData,
    })

    useEffect(() => {
        onSubmitLoadingChange?.(submitQuoteMutation.isPending)
    }, [submitQuoteMutation.isPending, onSubmitLoadingChange])

    useEffect(() => {
        const hasSelectedServices = hasIncludedQuoteServices({
            selectedServices: quoteData.selectedServices,
        })
        const hasValidTotal = quoteData.totalHT > 0
        onHasSelectedServicesChange?.(hasSelectedServices && hasValidTotal)
    }, [quoteData.selectedServices, quoteData.totalHT, onHasSelectedServicesChange])

    const submitQuote = useCallback(async () => {
        if (!requestData) {
            console.error("No request data available")
            return
        }

        const validationError = getQuoteSubmissionError(quoteData)
        if (validationError) {
            showErrorToast(validationError)
            return
        }

        try {
            const _result = await submitQuoteMutation.mutateAsync({
                requestId: requestData.id,
                quoteData,
            })
            onEditModeChange?.(false)
            onClose?.()
        } catch (error) {
            console.error("Error submitting quote:", error)
            console.error("Error details:", error)
        }
    }, [requestData, quoteData, submitQuoteMutation, onEditModeChange, onClose])

    useImperativeHandle(
        ref,
        () => ({
            submitQuote,
        }),
        [submitQuote]
    )

    const onDimensionChange = (dimension: string, value: number | null) => {
        setQuoteData((prev) => ({
            ...prev,
            cargoDetails: {
                ...prev.cargoDetails,
                dimensions: {
                    ...prev.cargoDetails.dimensions,
                    [dimension]: value,
                },
            },
        }))
    }

    const onOptionChange = (option: string, value: boolean) => {
        setQuoteData((prev) => ({
            ...prev,
            cargoDetails: {
                ...prev.cargoDetails,
                options: {
                    ...prev.cargoDetails.options,
                    [option]: value,
                },
            },
        }))
    }

    if (isRequestLoading) {
        return <RequestDetailsSkeleton />
    }

    if (requestError) {
        return (
            <Empty className="mt-6 min-h-[320px] border-0 bg-transparent">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FileText />
                    </EmptyMedia>
                    <EmptyTitle>Unable to load this request.</EmptyTitle>
                </EmptyHeader>
                <EmptyContent>
                    <Button radius="full" variant="outline" onClick={onRequestRefetch}>
                        Try again
                    </Button>
                </EmptyContent>
            </Empty>
        )
    }

    if (!requestData) {
        return (
            <Empty className="mt-6 min-h-[320px] border-0 bg-transparent">
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FileText />
                    </EmptyMedia>
                    <EmptyTitle>Request not found.</EmptyTitle>
                </EmptyHeader>
            </Empty>
        )
    }

    const showQuoteView = shouldShowQuoteView(requestData.lifecycleStatus, isEditMode)
    const requestActionPolicy = getRequestActionPolicy({
        scope: requestScope.scope,
        currentUserRole,
        currentUserId,
        assignedToId: requestData.assignedTo?.id ?? null,
        lifecycleStatus: requestData.lifecycleStatus,
    })

    return (
        <div className="flex flex-col gap-y-4 py-6">
            {showQuoteView && (
                <>
                    <QuoteDetailView
                        requestId={requestData.id}
                        onQuoteAction={onClose}
                        isOrganizationView={isOrganizationView}
                    />
                    {requestData.lifecycleStatus === "invoiced" && (
                        <InvoiceDetailView requestId={requestData.id} />
                    )}
                    <div className="w-full py-4">
                        <hr className="border-ds-surface-border" />
                    </div>
                </>
            )}

            <div className="mt-4 mb-8 space-y-4">
                <div className="flex items-center gap-3 text-sm">
                    <User className="h-4 w-4 flex-shrink-0 text-ds-fg-muted" />
                    <span className="min-w-24 text-ds-fg-muted">Requester</span>
                    <div className="flex items-center gap-2">
                        <span className="text-ds-fg">{requestData.requester.name}</span>
                        {!requestData.requester.id && <GuestBadge />}
                    </div>
                </div>
                {isOrganizationView && requestActionPolicy.canShowAssignmentSummary && (
                    <div className="flex items-center gap-3 text-sm">
                        <UserPlus className="h-4 w-4 flex-shrink-0 text-ds-fg-muted" />
                        <span className="min-w-24 text-ds-fg-muted">Assigned to</span>
                        {requestData.assignedTo ? (
                            <span className="text-ds-fg">{requestData.assignedTo.name}</span>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="text-ds-fg-subtle">Unassigned yet.</span>
                                {onOpenAssignDialog && requestActionPolicy.canAssignRequest && (
                                    <Button
                                        radius="full"
                                        variant="outline"
                                        onClick={onOpenAssignDialog}
                                        className="h-6 px-2 py-1 text-xs"
                                    >
                                        Assign
                                    </Button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3 text-sm">
                    <Calendar className="h-4 w-4 flex-shrink-0 text-ds-fg-muted" />
                    <span className="min-w-24 text-ds-fg-muted">Date range</span>
                    <span className="text-ds-fg">
                        {formatDateRange(
                            {
                                from: new Date(requestData.fromDate),
                                to: new Date(requestData.toDate),
                            },
                            { format: "full", locale: "en-GB", separator: " to " }
                        )}
                    </span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                    <Loader className="h-4 w-4 flex-shrink-0 text-ds-fg-muted" />
                    <span className="min-w-24 text-ds-fg-muted">Status</span>
                    <RequestStatusDisplay status={requestData.lifecycleStatus} />
                </div>

                {requestData.comments && (
                    <>
                        <div className="w-full py-2">
                            <hr className="border-ds-surface-border" />
                        </div>
                        <div className="flex items-start gap-3 text-sm leading-relaxed">
                            <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-ds-fg-muted" />
                            <span className="min-w-24 text-ds-fg-muted">Note</span>
                            <span className="text-ds-fg">{requestData.comments}</span>
                        </div>
                    </>
                )}

                {requestData.documents && requestData.documents.length > 0 && (
                    <>
                        <div className="w-full py-2">
                            <hr className="border-ds-surface-border" />
                        </div>
                        <div className="flex items-start gap-3 text-sm">
                            <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-ds-fg-muted" />
                            <span className="min-w-24 text-ds-fg-muted">Documents</span>
                            <div className="flex flex-1 flex-col gap-2">
                                {requestData.documents.map((docUrl: string, index: number) => {
                                    const fileName =
                                        docUrl.split("/").pop() || `Document ${index + 1}`
                                    return (
                                        <a
                                            key={docUrl}
                                            href={docUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 text-ds-link transition-colors hover:text-ds-link-hover hover:underline"
                                        >
                                            <span>{fileName}</span>
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    )
                                })}
                            </div>
                        </div>
                    </>
                )}
            </div>

            <div>
                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="font-medium text-base text-ds-fg leading-[1.5] tracking-tight">
                            Cargo types
                        </h3>

                        {isEditMode && (
                            <p className="mb-4 text-gray-600 text-sm">
                                Select the cargo types you can handle for this request.
                            </p>
                        )}
                    </div>

                    <RequestDetailContainer>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-x-2 gap-y-4">
                                {requestData.categories.map((category: Category) => (
                                    <SelectableCard
                                        key={category.id}
                                        id={category.id}
                                        name={category.name}
                                        layout="stacked"
                                        icon={<CategoryIcon slug={category.slug} />}
                                        interactive={isEditMode}
                                        checked={
                                            isEditMode &&
                                            quoteData.selectedCategories.includes(category.id)
                                        }
                                        onChange={toggleCategory}
                                        size="sm"
                                    />
                                ))}
                            </div>
                            {isEditMode && quoteData.selectedCategories.length === 0 && (
                                <FieldError>
                                    Please select at least one cargo type to submit quote
                                </FieldError>
                            )}
                        </div>
                    </RequestDetailContainer>
                </div>

                {hasCargoDetails(requestData.cargoDetails) && (
                    <>
                        <div className="w-full py-6"></div>
                        <div className="space-y-1">
                            <h3 className="font-medium text-base text-ds-fg leading-[1.5] tracking-tight">
                                Cargo details
                            </h3>
                            {isEditMode && (
                                <p className="mb-4 text-ds-fg-muted text-sm">
                                    Select which cargo specifications you can accommodate.
                                </p>
                            )}
                        </div>
                        <div className="default mt-4 space-y-4 rounded-sm border border-ds-surface-border bg-ds-surface">
                            <RequestDetailContainer>
                                <CargoDetailsDisplay
                                    cargoDetails={
                                        isEditMode
                                            ? quoteData.cargoDetails
                                            : requestData.cargoDetails
                                    }
                                    isEditMode={isEditMode}
                                    requestCargoDetails={requestData.cargoDetails}
                                    onCargoDetailChange={updateCargoDetail}
                                    onDimensionChange={onDimensionChange}
                                    onOptionChange={onOptionChange}
                                />
                            </RequestDetailContainer>
                        </div>
                    </>
                )}

                <div className="w-full py-6"></div>

                <div className="space-y-4">
                    <div className="space-y-1">
                        <h3 className="font-medium text-base text-ds-fg leading-[1.5] tracking-tight">
                            Services
                        </h3>
                        {isEditMode && (
                            <p className="mb-4 text-gray-600 text-sm">
                                Select the services you can provide for this request.
                            </p>
                        )}
                    </div>
                    <RequestDetailContainer>
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-2 gap-y-4">
                                {requestData.services.map((service: Service) => {
                                    const serviceQuote = quoteData.selectedServices.find(
                                        (sq) => sq.serviceId === service.id
                                    )
                                    return (
                                        <SelectableCard
                                            key={service.id}
                                            id={service.id}
                                            name={service.name}
                                            interactive={isEditMode}
                                            checked={
                                                isEditMode && (serviceQuote?.included || false)
                                            }
                                            onChange={toggleService}
                                            size="sm"
                                        />
                                    )
                                })}
                            </div>
                            {isEditMode && !hasIncludedQuoteServices(quoteData) && (
                                <FieldError>
                                    Please select at least one service to submit quote
                                </FieldError>
                            )}
                        </div>
                    </RequestDetailContainer>
                </div>

                {isEditMode && (
                    <>
                        <div className="w-full py-4"></div>
                        <div className="space-y-8">
                            {hasIncludedQuoteServices(quoteData) && (
                                <>
                                    <div className="rounded-sm bg-ds-surface">
                                        <ServicePricing
                                            quoteData={quoteData}
                                            services={requestData.services}
                                            priceSuggestions={priceSuggestions}
                                            onServicePriceChange={updateServicePrice}
                                            onVatRateChange={updateVatRate}
                                        />
                                    </div>

                                    <RequestDetailContainer>
                                        <Textarea
                                            className="max-h-[140px] min-h-[80px]"
                                            value={quoteData.description}
                                            onChange={(e) =>
                                                setQuoteData((prev) => ({
                                                    ...prev,
                                                    description: e.target.value,
                                                }))
                                            }
                                            placeholder="Add any additional general feedback for this quote                                                                            "
                                        />
                                    </RequestDetailContainer>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <h3 className="font-medium text-base text-ds-fg leading-[1.5] tracking-tight">
                                                Legal documents
                                            </h3>
                                            <p className="mb-4 text-gray-600 text-sm">
                                                Attached to your quote and shown to the client.
                                            </p>
                                        </div>
                                        <RequestDetailContainer>
                                            <LegalDocumentsSelector
                                                documents={legalDocuments}
                                                selectedIds={quoteData.legalDocumentIds}
                                                onSelectedIdsChange={handleLegalDocumentIdsChange}
                                                isLoading={isLoadingLegalDocuments}
                                                showError={
                                                    legalDocuments.length > 0 &&
                                                    quoteData.legalDocumentIds.length === 0
                                                }
                                            />
                                        </RequestDetailContainer>
                                    </div>

                                    <RequestDetailContainer
                                        title={"Quote Totals"}
                                        description={"Review your total pricing."}
                                    >
                                        <QuoteTotals quoteData={quoteData} />
                                    </RequestDetailContainer>
                                </>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    )
}
