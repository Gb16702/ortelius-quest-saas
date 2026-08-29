import { format } from "date-fns"
import { AlertTriangle, ChevronDown, MoreVertical } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import { formatCurrency } from "@/shared/lib/currency"
import { getDateFnsLocale } from "@/shared/lib/i18n/date-fns-locale"
import { Badge } from "@/shared/ui/badge"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Button } from "@/shared/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from "@/shared/ui/empty"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import { Skeleton } from "@/shared/ui/skeleton"
import { Spinner } from "@/shared/ui/spinner"
import { useInvoiceSheet } from "../model/hooks/use-invoice-sheet"
import type { StripeInvoice } from "../model/invoice-settings"
import { type InvoiceFilter, useInvoicesPage } from "../model/invoices-page.provider"
import { InvoiceSheet } from "./invoice-sheet"

function useFilterLabels(): Record<InvoiceFilter, string> {
    const { t } = useTranslation("settings")
    return {
        all: t("invoices.filter.all"),
        paid: t("invoices.filter.paid"),
        open: t("invoices.filter.open"),
        draft: t("invoices.filter.draft"),
    }
}

const STATUS_BADGE_VARIANTS: Record<string, "positive" | "attention" | "neutral" | "danger"> = {
    paid: "positive",
    open: "attention",
    draft: "neutral",
    void: "danger",
    uncollectible: "danger",
}

function formatInvoiceDate(timestamp: number, lang: string): string {
    return new Date(timestamp * 1000).toLocaleDateString(lang, {
        year: "numeric",
        month: "short",
        day: "numeric",
    })
}

function formatInvoiceMonth(timestamp: number, lang: string): string {
    return format(new Date(timestamp * 1000), "LLLL yyyy", { locale: getDateFnsLocale(lang) })
}

function formatStripeAmount(amount: number, currency: string): string {
    return formatCurrency(amount / 100, currency)
}

interface InvoiceRowProps {
    invoice: StripeInvoice
    menuOpen: boolean
    onMenuToggle: (invoiceId: string) => void
    onMenuClose: () => void
}

function InvoiceRow({ invoice, menuOpen, onMenuToggle, onMenuClose }: InvoiceRowProps) {
    const { t, i18n } = useTranslation("settings")
    const { openInvoice } = useInvoiceSheet()
    const totalDue = invoice.status === "paid" ? invoice.amountPaid : invoice.amountDue

    return (
        // biome-ignore lint/a11y/useSemanticElements: role chosen intentionally; semantic-element refactor pending
        <div
            className="flex cursor-pointer items-center justify-between border-ds-surface-border border-b px-6 py-4 transition-colors duration-200 last:border-b-0 hover:bg-ds-surface-hover"
            onClick={() => openInvoice(invoice.id)}
            onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    openInvoice(invoice.id)
                }
            }}
            role="button"
            tabIndex={0}
        >
            <div className="flex items-center gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-ds-fg text-sm">
                            {formatInvoiceMonth(invoice.periodStart, i18n.language)}
                        </span>
                        <Badge
                            size="sm"
                            variant={STATUS_BADGE_VARIANTS[invoice.status] ?? "neutral"}
                        >
                            {invoice.status}
                        </Badge>
                    </div>
                    <p className="text-ds-fg-muted text-xs">{invoice.number ?? "—"}</p>
                </div>
            </div>

            <div className="flex items-center gap-8">
                <div className="min-w-[100px]">
                    <p className="font-semibold text-ds-fg text-sm">
                        {formatStripeAmount(totalDue, invoice.currency)}
                    </p>
                    <p className="text-ds-fg-muted text-xs">{t("invoices.list.totalDue")}</p>
                </div>

                <p className="min-w-[130px] text-right text-ds-fg-muted text-sm">
                    {t("invoices.list.invoiced", {
                        date: formatInvoiceDate(invoice.created, i18n.language),
                    })}
                </p>

                {menuOpen ? (
                    <DropdownMenu open onOpenChange={(open) => !open && onMenuClose()}>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ds-fg transition-colors duration-150 hover:bg-ds-surface-interactive"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className="h-4 w-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    onMenuClose()
                                    openInvoice(invoice.id)
                                }}
                            >
                                {t("invoices.list.viewInvoice")}
                            </DropdownMenuItem>
                            {invoice.invoicePdf && (
                                <DropdownMenuItem asChild>
                                    <a
                                        href={invoice.invoicePdf}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {t("invoices.list.downloadPdf")}
                                    </a>
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                ) : (
                    <button
                        type="button"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-ds-fg transition-colors duration-150 hover:bg-ds-surface-interactive"
                        onClick={(e) => {
                            e.stopPropagation()
                            onMenuToggle(invoice.id)
                        }}
                    >
                        <MoreVertical className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    )
}

function InvoiceRowSkeleton() {
    return (
        <div className="flex items-center justify-between border-ds-surface-border border-b px-6 py-4 last:border-b-0">
            <div className="flex items-center gap-3">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-5 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                </div>
            </div>
            <div className="flex items-center gap-8">
                <div className="space-y-1.5">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-4 w-[130px]" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
        </div>
    )
}

function InvoicesListSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-10 w-[140px] rounded-sm" />
            <div
                className="overflow-hidden rounded-sm border border-ds-surface-border bg-ds-surface"
                style={{
                    maskImage: "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.3) 100%)",
                    WebkitMaskImage: "linear-gradient(to bottom, black 0%, rgba(0,0,0,0.3) 100%)",
                }}
            >
                {Array.from({ length: 4 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                    <InvoiceRowSkeleton key={i} />
                ))}
            </div>
        </div>
    )
}

function InvoicesEmptyState() {
    const { t } = useTranslation("settings")
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="font-medium text-ds-fg text-sm">{t("invoices.list.emptyTitle")}</p>
            <p className="mt-1 text-ds-fg-muted text-sm">{t("invoices.list.emptyDescription")}</p>
        </div>
    )
}

function InvoicesErrorState({ onRetry }: { onRetry: () => void }) {
    const { t } = useTranslation("settings")
    const { t: tCommon } = useTranslation("common")
    return (
        <Empty className="border-0 py-16">
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <AlertTriangle className="size-5" />
                </EmptyMedia>
                <EmptyTitle>{t("invoices.list.errorTitle")}</EmptyTitle>
                <EmptyDescription>{t("invoices.list.errorDescription")}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
                <Button variant="outline" size="sm" radius="full" onClick={onRetry}>
                    {tCommon("action.retry")}
                </Button>
            </EmptyContent>
        </Empty>
    )
}

export function InvoicesPageContent() {
    const { t } = useTranslation("settings")
    const filterLabels = useFilterLabels()
    const { state, actions } = useInvoicesPage()
    const { state: orgState, meta } = useOrg()
    const {
        invoices,
        filteredInvoices,
        isLoading,
        isError,
        hasLoadedInvoicePages,
        filter,
        hasNextPage,
        isFetchingNextPage,
    } = state
    const [openMenuId, setOpenMenuId] = useState<string | null>(null)

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav
                items={getOrgBreadcrumbItems(orgState.org, [
                    { label: t("nav.settings"), href: `/org/${meta.slug}/settings` },
                    { label: t("nav.invoices") },
                ])}
            />
            <ProfilePageHead title={t("invoices.title")} maxWidth="4xl" />
            <div className="flex w-full flex-col items-center px-4 sm:px-6">
                <div className="flex w-full max-w-4xl flex-col py-6">
                    {isLoading ? (
                        <InvoicesListSkeleton />
                    ) : isError && !hasLoadedInvoicePages ? (
                        <InvoicesErrorState onRetry={actions.retry} />
                    ) : invoices.length === 0 ? (
                        <InvoicesEmptyState />
                    ) : (
                        <div className="space-y-3">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="inline-flex h-10 items-center gap-2 rounded-sm border border-ds-surface-border bg-ds-surface px-3 font-medium text-ds-fg text-sm transition-colors duration-200 hover:border-ds-surface-border hover:bg-ds-surface-interactive"
                                    >
                                        {filterLabels[filter]}
                                        <ChevronDown className="h-4 w-4 text-ds-fg" />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start">
                                    {(
                                        Object.entries(filterLabels) as [InvoiceFilter, string][]
                                    ).map(([value, label]) => (
                                        <DropdownMenuItem
                                            key={value}
                                            onClick={() => actions.setFilter(value)}
                                        >
                                            {label}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <div className="overflow-hidden rounded-sm border border-ds-surface-border bg-ds-surface">
                                {filteredInvoices.length === 0 ? (
                                    <div className="flex items-center justify-center py-12">
                                        <p className="text-ds-fg-muted text-sm">
                                            {t("invoices.list.noFilteredFound", {
                                                filter: filterLabels[filter].toLowerCase(),
                                            })}
                                        </p>
                                    </div>
                                ) : (
                                    filteredInvoices.map((invoice) => (
                                        <InvoiceRow
                                            key={invoice.id}
                                            invoice={invoice}
                                            menuOpen={openMenuId === invoice.id}
                                            onMenuToggle={setOpenMenuId}
                                            onMenuClose={() => setOpenMenuId(null)}
                                        />
                                    ))
                                )}
                            </div>

                            {hasNextPage && filter === "all" && (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="w-full"
                                    onClick={actions.loadMore}
                                    disabled={isFetchingNextPage}
                                >
                                    {isFetchingNextPage ? <Spinner /> : t("invoices.list.loadMore")}
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <InvoiceSheet />
        </div>
    )
}
