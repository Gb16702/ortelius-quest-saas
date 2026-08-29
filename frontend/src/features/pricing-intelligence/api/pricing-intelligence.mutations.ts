import { useMutation, useQueryClient } from "@tanstack/react-query"
import { readJsonResponse } from "@/shared/api/http.response"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import type { ImportResult } from "../model/pricing-intelligence"
import {
    getPricingIntelligenceErrorMessage,
    importResultSchema,
    parsePricingIntelligenceApiData,
} from "../model/schemas/pricing-intelligence.schema"
import { pricingIntelligenceKeys } from "./pricing-intelligence.query-keys"

export function useImportCsv(organizationId: string | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (file: File): Promise<ImportResult> => {
            const formData = new FormData()
            formData.append("file", file)

            const response = await fetch(`/api/pricing-intelligence/import`, {
                method: "POST",
                credentials: "include",
                body: formData,
            })

            const payload = await readJsonResponse(response)
            if (!response.ok) {
                throw new Error(getPricingIntelligenceErrorMessage(payload, "Failed to import CSV"))
            }

            return parseSchema(
                importResultSchema,
                parsePricingIntelligenceApiData(payload, "Failed to import CSV")
            )
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: pricingIntelligenceKeys.imports(organizationId),
            })
            queryClient.invalidateQueries({
                queryKey: pricingIntelligenceKeys.stats(organizationId),
            })
        },
    })
}

export function useDeleteImportBatch(organizationId: string | null) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (batchId: string): Promise<void> => {
            const response = await fetch(`/api/pricing-intelligence/imports/${batchId}`, {
                method: "DELETE",
                credentials: "include",
            })

            const payload = await readJsonResponse(response)

            if (!response.ok) {
                throw new Error(
                    getPricingIntelligenceErrorMessage(payload, "Failed to delete import batch")
                )
            }

            if (payload) {
                parsePricingIntelligenceApiData(payload, "Failed to delete import batch")
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: pricingIntelligenceKeys.imports(organizationId),
            })
            queryClient.invalidateQueries({
                queryKey: pricingIntelligenceKeys.stats(organizationId),
            })
        },
    })
}
