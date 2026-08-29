import { FileText } from "lucide-react"
import { formatCurrency } from "@/shared/lib/currency"
import { formatDate } from "@/shared/lib/date"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { Separator } from "@/shared/ui/separator"
import { Skeleton } from "@/shared/ui/skeleton"
import { useInvoicesByRequest } from "../../model/hooks/use-invoice"
import { FavoriteToggleButton } from "../favorite-toggle-button"

interface InvoiceDetailViewProps {
    requestId: string
}

export function InvoiceDetailView({ requestId }: InvoiceDetailViewProps) {
    const { data: invoices, isLoading } = useInvoicesByRequest(requestId)

    if (isLoading) {
        return (
            <div className="space-y-6 rounded-sm border border-ds-surface-border bg-ds-surface py-4">
                <div className="flex items-center justify-between px-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-20" />
                </div>
                <div className="space-y-2 px-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                </div>
            </div>
        )
    }

    const invoice = invoices?.[0]

    if (!invoice) {
        return (
            <Empty>
                <EmptyHeader>
                    <EmptyMedia variant="icon">
                        <FileText strokeWidth={2} />
                    </EmptyMedia>
                    <EmptyTitle>No invoice available.</EmptyTitle>
                </EmptyHeader>
            </Empty>
        )
    }

    return (
        <div className="space-y-6 rounded-sm border border-ds-surface-border bg-ds-surface py-4">
            <div className="flex items-center justify-between px-4 text-sm">
                <span className="font-medium text-ds-fg">Invoice {invoice.invoiceNumber}</span>
                <FavoriteToggleButton
                    organizationId={invoice.organizationId}
                    entityType="invoice"
                    entityId={invoice.id}
                    optimisticFavorite={{
                        id: `optimistic:invoice:${invoice.id}`,
                        entityType: "invoice",
                        entityId: invoice.id,
                        organizationId: invoice.organizationId,
                        label: `Invoice ${invoice.invoiceNumber}`,
                        createdAt: invoice.createdAt,
                        meta: {
                            invoiceNumber: invoice.invoiceNumber,
                            requestId: invoice.requestId,
                            quoteId: invoice.quoteId,
                        },
                    }}
                />
            </div>

            <div className="flex justify-between px-4 text-sm">
                <span className="text-ds-fg">Issue Date</span>
                <span className="text-ds-fg">
                    {formatDate(new Date(invoice.issueDate), {
                        format: "full",
                        locale: "en-GB",
                    })}
                </span>
            </div>

            <div className="flex justify-between px-4 text-sm">
                <span className="text-ds-fg">Due Date</span>
                <span className="text-ds-fg">
                    {formatDate(new Date(invoice.dueDate), {
                        format: "full",
                        locale: "en-GB",
                    })}
                </span>
            </div>

            {invoice.pricing.lines && invoice.pricing.lines.length > 0 && (
                <>
                    <div className="space-y-4 px-4">
                        <h4 className="font-medium text-ds-fg text-sm leading-[1.5]">Items</h4>
                        <div className="space-y-2">
                            {invoice.pricing.lines.map((line) => (
                                <div
                                    key={line.id}
                                    className="flex items-center justify-between text-sm"
                                >
                                    <span className="text-ds-fg">
                                        {line.description}
                                        {line.quantity > 1 ? ` × ${line.quantity}` : ""}
                                    </span>
                                    <span className="font-medium text-ds-fg">
                                        {formatCurrency(line.totalPrice, invoice.pricing.currency)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <Separator />
                </>
            )}

            <div className="flex justify-between px-4 text-sm">
                <span className="text-ds-fg">Subtotal</span>
                <span className="text-ds-fg">
                    {formatCurrency(invoice.pricing.subtotal, invoice.pricing.currency)}
                </span>
            </div>

            <div className="flex justify-between px-4 text-sm">
                <span className="text-ds-fg">VAT ({invoice.pricing.vatPercentage}%)</span>
                <span className="text-ds-fg">
                    {formatCurrency(invoice.pricing.vatAmount, invoice.pricing.currency)}
                </span>
            </div>

            <Separator />

            <div className="flex justify-between px-4">
                <span className="font-medium text-ds-fg text-sm">Total</span>
                <span className="font-medium text-ds-fg text-sm">
                    {formatCurrency(invoice.pricing.totalAmount, invoice.pricing.currency)}
                </span>
            </div>

            {(invoice.description || invoice.notes || invoice.terms) && (
                <>
                    <Separator />
                    <div className="space-y-2 px-4">
                        <h4 className="font-medium text-ds-fg text-sm leading-[1.5]">
                            Additional Information
                        </h4>
                        {invoice.description && (
                            <p className="text-ds-fg text-sm leading-relaxed">
                                {invoice.description}
                            </p>
                        )}
                        {invoice.notes && (
                            <p className="text-ds-fg text-sm leading-relaxed">{invoice.notes}</p>
                        )}
                        {invoice.terms && (
                            <p className="text-ds-fg text-sm leading-relaxed">{invoice.terms}</p>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}
