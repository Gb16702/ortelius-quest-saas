import { AlertOctagon, Download, FileQuestion, FileText } from "lucide-react"
import { formatCurrency } from "@/shared/lib/currency"
import { formatDate } from "@/shared/lib/date"
import { formatFileSize } from "@/shared/lib/file-size"
import { Alert, AlertDescription } from "@/shared/ui/alert"
import { Button } from "@/shared/ui/button"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { Separator } from "@/shared/ui/separator"
import { useQuotesByRequest } from "../../model/hooks/use-quote"
import { useQuoteDialogs } from "../../model/hooks/use-quote-dialogs"
import { FavoriteToggleButton } from "../favorite-toggle-button"
import { QuoteAcceptanceDialog } from "./quote-acceptance-dialog"
import { QuoteDetailViewSkeleton } from "./quote-detail-view-skeleton"
import { QuoteRejectionDialog } from "./quote-rejection-dialog"
import { QuoteStatusBadge } from "./quote-status-badge"
import { QuoteTimeline } from "./quote-timeline"

interface QuoteDetailViewProps {
    requestId: string
    onQuoteAction?: () => void
    isOrganizationView?: boolean
}

export function QuoteDetailView({
    requestId,
    onQuoteAction,
    isOrganizationView = false,
}: QuoteDetailViewProps) {
    const { data: quotes, isLoading } = useQuotesByRequest(requestId)

    const latestQuote = quotes?.find((q) => q.status === "sent") || quotes?.[0]
    const previousQuotes = quotes?.filter((q) => q.id !== latestQuote?.id) || []

    const dialogs = useQuoteDialogs(onQuoteAction)

    if (isLoading) {
        return <QuoteDetailViewSkeleton />
    }

    if (!latestQuote) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FileQuestion strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>No quote available.</EmptyTitle>
                </EmptyHeader>
            </Empty>
        )
    }

    const canTakeAction = latestQuote.status === "sent"
    const isRejected = latestQuote.status === "rejected"

    return (
        <>
            <div className="space-y-6">
                {isRejected && isOrganizationView && (
                    <Alert variant="destructive">
                        <AlertOctagon className="size-4" />
                        <AlertDescription>
                            This quote was rejected by the requester. Please review the feedback
                            below and create a new quote with adjustments.
                        </AlertDescription>
                    </Alert>
                )}

                <div className="space-y-6 rounded-sm border border-ds-surface-border bg-ds-surface py-4">
                    <div className="flex items-center justify-between px-4 text-sm">
                        <span className="font-medium text-ds-fg">
                            Quote {latestQuote.quoteNumber}
                        </span>
                        <div className="flex items-center gap-2">
                            <FavoriteToggleButton
                                organizationId={latestQuote.organizationId}
                                entityType="quote"
                                entityId={latestQuote.id}
                                optimisticFavorite={{
                                    id: `optimistic:quote:${latestQuote.id}`,
                                    entityType: "quote",
                                    entityId: latestQuote.id,
                                    organizationId: latestQuote.organizationId,
                                    label: `Quote ${latestQuote.quoteNumber}`,
                                    createdAt: latestQuote.createdAt,
                                    meta: {
                                        quoteNumber: latestQuote.quoteNumber,
                                        requestId: latestQuote.requestId,
                                    },
                                }}
                            />
                            <QuoteStatusBadge status={latestQuote.status} />
                        </div>
                    </div>

                    {latestQuote.validUntil && !isRejected && (
                        <div className="flex justify-between px-4 text-sm">
                            <span className="text-ds-fg">Valid Until</span>
                            <span className="text-ds-fg">
                                {formatDate(new Date(latestQuote.validUntil), {
                                    format: "full",
                                    locale: "en-GB",
                                })}
                            </span>
                        </div>
                    )}

                    {latestQuote.pricing.services && latestQuote.pricing.services.length > 0 && (
                        <>
                            <div className="space-y-4 px-4">
                                <h4 className="font-medium text-ds-fg text-sm leading-[1.5]">
                                    Services Included
                                </h4>
                                <div className="space-y-2">
                                    {latestQuote.pricing.services.map((service) => (
                                        <div
                                            key={service.id}
                                            className="flex items-center justify-between text-sm"
                                        >
                                            <span className="text-ds-fg">{service.name}</span>
                                            <span className="font-medium text-ds-fg">
                                                {formatCurrency(
                                                    service.price,
                                                    latestQuote.pricing.currency
                                                )}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />
                        </>
                    )}

                    <div className="flex justify-between px-4 text-sm">
                        <span className="text-ds-fg">Total (Excl. VAT)</span>
                        <span className="text-ds-fg">
                            {formatCurrency(
                                latestQuote.pricing.totalHT,
                                latestQuote.pricing.currency
                            )}
                        </span>
                    </div>

                    <div className="flex justify-between px-4 text-sm">
                        <span className="text-ds-fg">VAT ({latestQuote.pricing.vatRate}%)</span>
                        <span className="text-ds-fg">
                            {formatCurrency(
                                latestQuote.pricing.vatAmount,
                                latestQuote.pricing.currency
                            )}
                        </span>
                    </div>

                    <Separator />

                    <div className="flex justify-between px-4">
                        <span className="font-medium text-ds-fg text-sm">Total</span>
                        <span className="font-medium text-ds-fg text-sm">
                            {formatCurrency(
                                latestQuote.pricing.totalTTC,
                                latestQuote.pricing.currency
                            )}
                        </span>
                    </div>

                    {latestQuote.legalDocuments && latestQuote.legalDocuments.length > 0 && (
                        <>
                            <Separator />
                            <div className="space-y-2 px-4">
                                <h4 className="font-medium text-ds-fg text-sm leading-[1.5]">
                                    Legal documents
                                </h4>
                                <div className="divide-y divide-ds-surface-border rounded-sm border border-ds-surface-border bg-ds-surface">
                                    {latestQuote.legalDocuments.map((doc) => (
                                        <a
                                            key={doc.id}
                                            href={doc.downloadUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-ds-surface-hover"
                                        >
                                            <div className="flex min-w-0 items-center gap-3">
                                                <FileText className="size-4 flex-shrink-0 text-ds-fg-muted" />
                                                <div className="min-w-0">
                                                    <p className="truncate font-medium text-ds-fg text-sm">
                                                        {doc.label}
                                                    </p>
                                                    <p className="text-ds-fg-muted text-xs">
                                                        {formatFileSize(doc.sizeBytes)}
                                                    </p>
                                                </div>
                                            </div>
                                            <Download className="size-4 flex-shrink-0 text-ds-fg-muted" />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {(latestQuote.description ||
                        latestQuote.comments?.comment ||
                        latestQuote.comments?.additionalComment ||
                        latestQuote.pricing.notes) && (
                        <>
                            <Separator />
                            <div className="space-y-2 px-4">
                                <h4 className="font-medium text-ds-fg text-sm leading-[1.5]">
                                    Additional Information
                                </h4>
                                {latestQuote.description && (
                                    <p className="text-ds-fg text-sm leading-relaxed">
                                        {latestQuote.description}
                                    </p>
                                )}
                                {latestQuote.comments?.comment && (
                                    <p className="text-ds-fg text-sm leading-relaxed">
                                        {latestQuote.comments.comment}
                                    </p>
                                )}
                                {latestQuote.comments?.additionalComment && (
                                    <p className="text-ds-fg text-sm leading-relaxed">
                                        {latestQuote.comments.additionalComment}
                                    </p>
                                )}
                                {latestQuote.pricing.notes && (
                                    <p className="text-ds-fg text-sm leading-relaxed">
                                        {latestQuote.pricing.notes}
                                    </p>
                                )}
                            </div>
                        </>
                    )}

                    {isRejected && latestQuote.rejectionReason && (
                        <>
                            <Separator />
                            <div className="space-y-4 px-4">
                                <h4 className="font-medium text-ds-fg text-sm leading-[1.5]">
                                    Rejection Reason
                                </h4>
                                <div>
                                    <p className="text-ds-fg text-sm italic leading-relaxed">
                                        "{latestQuote.rejectionReason}"
                                    </p>
                                </div>
                                {latestQuote.respondedAt && (
                                    <p className="text-ds-fg-muted text-xs">
                                        Rejected on{" "}
                                        {formatDate(new Date(latestQuote.respondedAt), {
                                            format: "full",
                                            locale: "en-GB",
                                        })}
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {previousQuotes.length > 0 && <QuoteTimeline quotes={previousQuotes} />}

                {canTakeAction && !isOrganizationView && (
                    <div className="flex flex-col gap-3">
                        <Button
                            size={"lg"}
                            radius="full"
                            variant="solid"
                            onClick={() => {
                                dialogs.openAcceptDialog(latestQuote)
                            }}
                            disabled={dialogs.isActionPending}
                        >
                            Accept Quote
                        </Button>
                        <Button
                            size={"lg"}
                            radius="full"
                            variant="ghost"
                            onClick={() => {
                                dialogs.openRejectDialog(latestQuote)
                            }}
                            disabled={dialogs.isActionPending}
                        >
                            Reject Quote
                        </Button>
                    </div>
                )}
            </div>

            {dialogs.isAcceptDialogOpen && (
                <QuoteAcceptanceDialog
                    isOpen={true}
                    onClose={dialogs.closeDialogs}
                    quote={dialogs.selectedQuote}
                    onConfirm={dialogs.confirmAcceptance}
                    isLoading={dialogs.isAccepting}
                />
            )}

            {dialogs.isRejectDialogOpen && (
                <QuoteRejectionDialog
                    isOpen={true}
                    onClose={dialogs.closeDialogs}
                    quote={dialogs.selectedQuote}
                    onConfirm={dialogs.confirmRejection}
                    isLoading={dialogs.isRejecting}
                />
            )}
        </>
    )
}
