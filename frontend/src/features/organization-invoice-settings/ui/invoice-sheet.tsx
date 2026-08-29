import { useTranslation } from "react-i18next"
import { formatCurrency } from "@/shared/lib/currency"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/ui/sheet"
import { Skeleton } from "@/shared/ui/skeleton"
import { useInvoiceDetail } from "../api/invoice-settings.api"
import { useInvoiceSheet } from "../model/hooks/use-invoice-sheet"
import { useInvoicesPage } from "../model/invoices-page.provider"

const STATUS_BADGE_VARIANTS: Record<string, "positive" | "attention" | "neutral" | "danger"> = {
    paid: "positive",
    open: "attention",
    draft: "neutral",
    void: "danger",
    uncollectible: "danger",
}

function formatStripeAmount(amount: number, currency: string): string {
    return formatCurrency(amount / 100, currency)
}

function InvoiceSheetSkeleton() {
    return (
        <div className="flex flex-col gap-6 px-8">
            <div className="space-y-2">
                <Skeleton className="h-3 w-14" />
                <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-24" />
                    <Skeleton className="h-5 w-10 rounded-full" />
                    <Skeleton className="h-9 w-36" />
                </div>
            </div>

            <div className="border-ds-surface-border border-t" />

            <div>
                <Skeleton className="mb-4 h-5 w-24" />
                <div className="overflow-hidden rounded-sm border border-ds-surface-border">
                    <div className="flex justify-between border-ds-surface-border border-b bg-ds-canvas px-6 py-3">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-3 w-16" />
                    </div>
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div
                            // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                            key={i}
                            className="flex items-center justify-between border-ds-surface-border border-b px-6 py-4 last:border-b-0"
                        >
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-8" />
                            <Skeleton className="h-4 w-16" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

function InvoiceSheetContent({
    organizationId,
    invoiceId,
}: {
    organizationId: string
    invoiceId: string
}) {
    const { t } = useTranslation("settings")
    const { data: invoice, isLoading, isError } = useInvoiceDetail(organizationId, invoiceId)

    if (isLoading) {
        return <InvoiceSheetSkeleton />
    }

    if (isError || !invoice) {
        return (
            <div className="flex items-center justify-center px-8 py-12">
                <p className="text-ds-fg-muted text-sm">{t("invoices.list.loadFailed")}</p>
            </div>
        )
    }

    const totalDue = invoice.status === "paid" ? invoice.amountPaid : invoice.amountDue

    return (
        <div className="flex flex-col gap-12 px-8 pt-4">
            <div className="flex gap-8">
                <div>
                    <p className="font-medium text-ds-fg-muted text-sm">
                        {t("invoices.sheet.totalDue")}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                        <span className="font-semibold text-3xl text-ds-fg">
                            {formatStripeAmount(totalDue, invoice.currency)}
                        </span>
                        <Badge
                            size="sm"
                            variant={STATUS_BADGE_VARIANTS[invoice.status] ?? "neutral"}
                        >
                            {invoice.status}
                        </Badge>
                    </div>
                </div>
                <div>
                    <p className="font-medium text-ds-fg-muted text-sm">
                        {t("invoices.sheet.invoiceNumber")}
                    </p>
                    <p className="mt-1 font-mono font-semibold text-3xl text-ds-fg">
                        {invoice.number ?? "—"}
                    </p>
                </div>
            </div>

            <div>
                <div>
                    <div className="flex items-center border-ds-surface-border border-b pb-3">
                        <span className="flex-1 font-medium text-ds-fg-muted text-sm">
                            {t("invoices.sheet.product")}
                        </span>
                        <span className="w-20 font-medium text-ds-fg-muted text-sm">
                            {t("invoices.sheet.qty")}
                        </span>
                        <span className="w-24 text-right font-medium text-ds-fg-muted text-sm">
                            {t("invoices.sheet.totalCost")}
                        </span>
                    </div>

                    <div className="mt-2">
                        {invoice.lineItems.map((item) => (
                            <div key={item.id} className="flex items-center py-3">
                                <span className="flex-1 font-medium text-ds-fg text-sm">
                                    {item.description}
                                </span>
                                <span className="w-20 text-ds-fg-muted text-sm">
                                    {item.quantity ?? 1}
                                </span>
                                <span className="w-24 text-right text-ds-fg-muted text-sm">
                                    {formatStripeAmount(item.amount, item.currency)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="mt-6 space-y-3 border-ds-surface-border border-t pt-3">
                    {invoice.subtotal !== invoice.total && (
                        <div className="flex items-center justify-between">
                            <span className="text-ds-fg-muted text-sm">
                                {t("invoices.sheet.subtotal")}
                            </span>
                            <span className="text-ds-fg text-sm">
                                {formatStripeAmount(invoice.subtotal, invoice.currency)}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center justify-between">
                        <span className="font-medium text-ds-fg text-sm">
                            {t("invoices.sheet.total")}
                        </span>
                        <span className="font-semibold text-ds-fg text-sm">
                            {formatStripeAmount(invoice.total, invoice.currency)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}

function InvoiceSheetFooter({ invoicePdf }: { invoicePdf: string | null }) {
    const { t } = useTranslation("settings")
    return (
        <div className="flex shrink-0 flex-col gap-3 bg-gradient-to-b from-transparent via-10% via-ds-surface to-ds-surface px-8 pt-2 pb-4">
            {invoicePdf && (
                <Button variant="solid" radius="full" size="xl" className="w-full" asChild>
                    <a href={invoicePdf} target="_blank" rel="noopener noreferrer">
                        {t("invoices.sheet.download")}
                    </a>
                </Button>
            )}
            <Button variant="ghost" radius="full" size="xl" className="w-full" asChild>
                <a href="mailto:support@ortelius.app">{t("invoices.sheet.contactSupport")}</a>
            </Button>
        </div>
    )
}

export function InvoiceSheet() {
    const { t } = useTranslation("settings")
    const { invoiceId, isOpen, closeInvoice } = useInvoiceSheet()
    const { meta } = useInvoicesPage()

    if (!isOpen) return null

    return (
        <Sheet open onOpenChange={(open) => !open && closeInvoice()}>
            <SheetContent
                side="right"
                className="!h-[calc(100vh-1.5rem)] bottom-3 m-3 rounded-lg bg-ds-surface p-0 [box-shadow:var(--shadow-bottom-sheet)]"
                onOpenAutoFocus={(e) => e.preventDefault()}
            >
                <SheetHeader>
                    <SheetTitle>{t("invoices.sheet.title")}</SheetTitle>
                </SheetHeader>
                <div className="flex-1 overflow-y-auto">
                    {invoiceId && (
                        <InvoiceSheetContent
                            organizationId={meta.organizationId}
                            invoiceId={invoiceId}
                        />
                    )}
                </div>
                {invoiceId && (
                    <InvoiceSheetFooterWrapper
                        organizationId={meta.organizationId}
                        invoiceId={invoiceId}
                    />
                )}
            </SheetContent>
        </Sheet>
    )
}

function InvoiceSheetFooterWrapper({
    organizationId,
    invoiceId,
}: {
    organizationId: string
    invoiceId: string
}) {
    const { data: invoice } = useInvoiceDetail(organizationId, invoiceId)

    if (!invoice) return null

    return <InvoiceSheetFooter invoicePdf={invoice.invoicePdf ?? null} />
}
