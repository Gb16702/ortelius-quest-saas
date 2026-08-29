import { type Dispatch, type SetStateAction, useCallback } from "react"
import type { QuoteData } from "../request"

interface UseQuoteActionsProps {
    setQuoteData: Dispatch<SetStateAction<QuoteData>>
    calculateTotals: (
        services: Array<{ serviceId: string; included: boolean; price: number }>,
        vatRate: number
    ) => { totalHT: number; vatAmount: number; totalTTC: number }
}

export function useQuoteActions({ setQuoteData, calculateTotals }: UseQuoteActionsProps) {
    const toggleCategory = useCallback(
        (categoryId: string) => {
            setQuoteData((prev) => ({
                ...prev,
                selectedCategories: prev.selectedCategories.includes(categoryId)
                    ? prev.selectedCategories.filter((id) => id !== categoryId)
                    : [...prev.selectedCategories, categoryId],
            }))
        },
        [setQuoteData]
    )

    const toggleService = useCallback(
        (serviceId: string) => {
            setQuoteData((prev) => {
                const updatedServices = prev.selectedServices.map((service) =>
                    service.serviceId === serviceId
                        ? { ...service, included: !service.included }
                        : service
                )
                const totals = calculateTotals(updatedServices, prev.vatRate)
                return {
                    ...prev,
                    selectedServices: updatedServices,
                    ...totals,
                }
            })
        },
        [setQuoteData, calculateTotals]
    )

    const updateServicePrice = useCallback(
        (serviceId: string, price: number) => {
            setQuoteData((prev) => {
                const updatedServices = prev.selectedServices.map((service) =>
                    service.serviceId === serviceId ? { ...service, price } : service
                )
                const totals = calculateTotals(updatedServices, prev.vatRate)
                return {
                    ...prev,
                    selectedServices: updatedServices,
                    ...totals,
                }
            })
        },
        [setQuoteData, calculateTotals]
    )

    const updateCargoDetail = useCallback(
        (field: string, value: string | number | boolean | null) => {
            setQuoteData((prev) => ({
                ...prev,
                cargoDetails: {
                    ...prev.cargoDetails,
                    [field]: value,
                },
            }))
        },
        [setQuoteData]
    )

    const updateVatRate = useCallback(
        (vatRate: number) => {
            setQuoteData((prev) => {
                const totals = calculateTotals(prev.selectedServices, vatRate)
                return {
                    ...prev,
                    vatRate,
                    ...totals,
                }
            })
        },
        [setQuoteData, calculateTotals]
    )

    return {
        toggleCategory,
        toggleService,
        updateServicePrice,
        updateCargoDetail,
        updateVatRate,
    }
}
