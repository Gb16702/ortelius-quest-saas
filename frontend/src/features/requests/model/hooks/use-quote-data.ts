import { useEffect, useMemo, useRef } from "react"

import {
    getPricingSuggestionsApplicationKey,
    type SuggestPricingContext,
    usePriceSuggestions,
} from "../../api/pricing-suggestions.query"

import { createInitialQuoteData } from "../../lib/initial-quote-data"
import {
    applyQuotePriceSuggestionsToDraft,
    getActiveQuotePriceSuggestions,
} from "../quote-price-suggestions"
import type { RequestData } from "../request"
import { useQuoteState } from "./use-quote.state"
import { useQuoteActions } from "./use-quote-actions"
import { useQuoteCalculations } from "./use-quote-calculations"

interface UseQuoteDataProps {
    requestData: RequestData | null
    isEditMode: boolean
}

export function useQuoteData({ requestData, isEditMode }: UseQuoteDataProps) {
    const { quoteData, setQuoteData } = useQuoteState()
    const { calculateTotals } = useQuoteCalculations()
    const actions = useQuoteActions({ setQuoteData, calculateTotals })

    const isInitializedRef = useRef(false)
    const appliedSuggestionsKeyRef = useRef<string | null>(null)

    const pricingContext = useMemo<SuggestPricingContext | null>(() => {
        if (!requestData) return null

        return {
            serviceIds: requestData.services.map((service) => service.id),
            cargoCategories: requestData.categories.map((category) => category.id),
            cargoWeight: requestData.cargoDetails?.weight ?? null,
            cargoVolume: requestData.cargoDetails?.volume ?? null,
            cargoIsHazardous: requestData.cargoDetails?.options?.hazardous ?? false,
            cargoIsReefer: requestData.cargoDetails?.options?.perishableGoods ?? false,
            cargoIsOversized: false,
        }
    }, [requestData])

    const priceSuggestionsQuery = usePriceSuggestions(requestData?.id, pricingContext, {
        enabled: isEditMode,
    })
    const priceSuggestions = getActiveQuotePriceSuggestions(
        requestData?.id,
        priceSuggestionsQuery.data
    )

    // biome-ignore lint/correctness/useExhaustiveDependencies: deps are intentional triggers (reset refs when quote or mode changes), not values read in the body
    useEffect(() => {
        isInitializedRef.current = false
        appliedSuggestionsKeyRef.current = null
    }, [requestData?.id, isEditMode])

    useEffect(() => {
        if (!requestData || isInitializedRef.current) return

        isInitializedRef.current = true

        if (!isEditMode) return

        setQuoteData(createInitialQuoteData(requestData))
    }, [requestData, isEditMode, setQuoteData])

    useEffect(() => {
        if (!requestData || !isEditMode || !priceSuggestionsQuery.data) return

        const applicationKey = getPricingSuggestionsApplicationKey(
            priceSuggestionsQuery.data.requestId,
            priceSuggestionsQuery.data.context
        )
        if (appliedSuggestionsKeyRef.current === applicationKey) return
        appliedSuggestionsKeyRef.current = applicationKey

        setQuoteData((prev) =>
            applyQuotePriceSuggestionsToDraft({
                activeRequestId: requestData.id,
                result: priceSuggestionsQuery.data,
                quoteData: prev,
                calculateTotals,
            })
        )
    }, [requestData, isEditMode, priceSuggestionsQuery.data, setQuoteData, calculateTotals])

    useEffect(() => {
        if (!priceSuggestionsQuery.error) return

        console.error(
            "[Pricing Intelligence] Failed to fetch suggestions:",
            priceSuggestionsQuery.error
        )
    }, [priceSuggestionsQuery.error])

    return {
        quoteData,
        setQuoteData,
        priceSuggestions,
        ...actions,
    }
}
