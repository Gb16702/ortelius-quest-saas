import { createContext, type ReactNode, use, useEffect, useMemo, useState } from "react"
import { showRetryErrorToast } from "@/shared/ui/toasts"
import { useInvoices } from "../api/invoice-settings.api"
import type { StripeInvoice } from "./invoice-settings"

export type InvoiceFilter = "all" | "paid" | "open" | "draft"

interface InvoicesPageState {
    invoices: StripeInvoice[]
    filteredInvoices: StripeInvoice[]
    isLoading: boolean
    isError: boolean
    hasLoadedInvoicePages: boolean
    hasNextPage: boolean
    isFetchingNextPage: boolean
    filter: InvoiceFilter
}

interface InvoicesPageActions {
    setFilter: (filter: InvoiceFilter) => void
    loadMore: () => void
    retry: () => void
}

interface InvoicesPageContextValue {
    state: InvoicesPageState
    actions: InvoicesPageActions
    meta: { organizationId: string }
}

const InvoicesPageContext = createContext<InvoicesPageContextValue | null>(null)

export function useInvoicesPage(): InvoicesPageContextValue {
    const ctx = use(InvoicesPageContext)
    if (!ctx) {
        throw new Error("useInvoicesPage must be used within InvoicesPageProvider")
    }
    return ctx
}

interface InvoicesPageProviderProps {
    organizationId: string
    children: ReactNode
}

export function InvoicesPageProvider({ organizationId, children }: InvoicesPageProviderProps) {
    const invoicesQuery = useInvoices(organizationId)
    const { data, isLoading, isError, hasNextPage, isFetchingNextPage, fetchNextPage } =
        invoicesQuery

    const [filter, setFilter] = useState<InvoiceFilter>("all")

    useEffect(() => {
        if (!invoicesQuery.isError) return
        showRetryErrorToast("Failed to load invoices", {
            onRetry: () => invoicesQuery.refetch(),
        })
    }, [invoicesQuery.isError, invoicesQuery.refetch])

    const hasLoadedInvoicePages = data?.pages !== undefined
    const invoices = data?.pages.flatMap((page) => page.invoices) ?? []

    const filteredInvoices =
        filter === "all" ? invoices : invoices.filter((inv) => inv.status === filter)

    const value = useMemo(
        (): InvoicesPageContextValue => ({
            state: {
                invoices,
                filteredInvoices,
                isLoading,
                isError,
                hasLoadedInvoicePages,
                hasNextPage: hasNextPage ?? false,
                isFetchingNextPage,
                filter,
            },
            actions: {
                setFilter,
                loadMore: () => fetchNextPage(),
                retry: () => {
                    void invoicesQuery.refetch()
                },
            },
            meta: { organizationId },
        }),
        [
            organizationId,
            invoices,
            filteredInvoices,
            isLoading,
            isError,
            hasLoadedInvoicePages,
            hasNextPage,
            isFetchingNextPage,
            filter,
            fetchNextPage,
            invoicesQuery.refetch,
        ]
    )

    return <InvoicesPageContext value={value}>{children}</InvoicesPageContext>
}
