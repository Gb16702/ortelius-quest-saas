import { createContext, type ReactNode, use, useCallback, useMemo } from "react"

import { showErrorToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"

import { useImportBatches, usePricingIntelligenceStats } from "../api/pricing-intelligence.api"
import { useDeleteImportBatch, useImportCsv } from "../api/pricing-intelligence.mutations"
import type { ImportBatch, ImportResult, PricingIntelligenceStats } from "./pricing-intelligence"

interface PricingIntelligenceState {
    stats: PricingIntelligenceStats | undefined
    batches: ImportBatch[]
    isLoadingStats: boolean
    isLoadingBatches: boolean
    isImporting: boolean
    isDeleting: boolean
}

interface PricingIntelligenceActions {
    importCsv: (file: File) => void
    deleteBatch: (batchId: string) => void
}

interface PricingIntelligenceContextValue {
    state: PricingIntelligenceState
    actions: PricingIntelligenceActions
}

const PricingIntelligenceContext = createContext<PricingIntelligenceContextValue | null>(null)

export function usePricingIntelligence(): PricingIntelligenceContextValue {
    const ctx = use(PricingIntelligenceContext)
    if (!ctx) {
        throw new Error("usePricingIntelligence must be used within PricingIntelligenceProvider")
    }
    return ctx
}

interface PricingIntelligenceProviderProps {
    organizationId: string | null
    children: ReactNode
}

export function PricingIntelligenceProvider({
    organizationId,
    children,
}: PricingIntelligenceProviderProps) {
    const { data: stats, isLoading: isLoadingStats } = usePricingIntelligenceStats(organizationId)
    const { data: batches, isLoading: isLoadingBatches } = useImportBatches(organizationId)

    const importMutation = useImportCsv(organizationId)
    const deleteMutation = useDeleteImportBatch(organizationId)

    const importCsv = useCallback(
        (file: File) => {
            importMutation.mutate(file, {
                onSuccess: (result: ImportResult) => {
                    if (result.errorCount > 0) {
                        showSuccessToast(
                            `Imported ${result.rowCount} transactions with ${result.errorCount} errors`
                        )
                    } else {
                        showSuccessToast(`Imported ${result.rowCount} transactions`)
                    }
                },
                onError: (error: Error) => {
                    showErrorToast(error.message)
                },
            })
        },
        [importMutation]
    )

    const deleteBatch = useCallback(
        (batchId: string) => {
            deleteMutation.mutate(batchId, {
                onSuccess: () => {
                    showSuccessToast("Import batch deleted")
                },
                onError: (error: Error) => {
                    showRetryErrorToast(error.message, {
                        onRetry: () => deleteBatch(batchId),
                    })
                },
            })
        },
        [deleteMutation]
    )

    const value = useMemo(
        (): PricingIntelligenceContextValue => ({
            state: {
                stats,
                batches: batches ?? [],
                isLoadingStats,
                isLoadingBatches,
                isImporting: importMutation.isPending,
                isDeleting: deleteMutation.isPending,
            },
            actions: {
                importCsv,
                deleteBatch,
            },
        }),
        [
            stats,
            batches,
            isLoadingStats,
            isLoadingBatches,
            importMutation.isPending,
            deleteMutation.isPending,
            importCsv,
            deleteBatch,
        ]
    )

    return <PricingIntelligenceContext value={value}>{children}</PricingIntelligenceContext>
}
