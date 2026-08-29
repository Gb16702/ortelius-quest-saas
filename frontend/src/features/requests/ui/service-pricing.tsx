import { memo, useId, useMemo } from "react"
import { Field, FieldLabel, FieldTitle } from "@/shared/ui/field"
import {
    InputGroup,
    InputGroupAddon,
    InputGroupInput,
    InputGroupText,
} from "@/shared/ui/input-group"
import { Note } from "@/shared/ui/note"
import type { PriceSuggestion } from "../api/pricing-suggestions.query"

import type { QuoteData, Service } from "../model/request"

interface ServicePricingProps {
    quoteData: QuoteData
    services: Service[]
    priceSuggestions?: PriceSuggestion[]
    onServicePriceChange: (serviceId: string, price: number) => void
    onVatRateChange: (vatRate: number) => void
}

export const ServicePricing = memo(function ServicePricing({
    quoteData,
    services,
    priceSuggestions = [],
    onServicePriceChange,
    onVatRateChange,
}: ServicePricingProps) {
    const vatRateId = useId()
    const includedServices = useMemo(
        () => quoteData.selectedServices.filter((service) => service.included),
        [quoteData.selectedServices]
    )

    const suggestionMap = useMemo(() => {
        const map = new Map<string, PriceSuggestion>()
        for (const s of priceSuggestions) {
            map.set(s.serviceId, s)
        }
        return map
    }, [priceSuggestions])

    return (
        <div className="space-y-4">
            {priceSuggestions.length > 0 && (
                <Note type="info" label={false}>
                    Prices suggested based on your past quotes. Adjust as needed.
                </Note>
            )}

            {includedServices.map((service) => {
                const serviceData = services.find((s: Service) => s.id === service.serviceId)

                if (!serviceData) {
                    return null
                }

                const _suggestion = suggestionMap.get(service.serviceId)

                return (
                    <Field
                        key={service.serviceId}
                        orientation="horizontal"
                        className="items-center justify-between gap-4"
                    >
                        <FieldTitle className="flex-1 text-ds-fg text-sm">
                            {serviceData.name}
                        </FieldTitle>
                        <InputGroup size="sm" className="w-44">
                            <InputGroupAddon align="inline-start">
                                <InputGroupText>€</InputGroupText>
                            </InputGroupAddon>
                            <InputGroupInput
                                type="text"
                                inputMode="numeric"
                                aria-label={`Price for ${serviceData.name}`}
                                value={service.price || ""}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/[^0-9]/g, "")
                                    onServicePriceChange(service.serviceId, Number(value) || 0)
                                }}
                                placeholder="0"
                                min="0"
                            />
                            <InputGroupAddon align="inline-end">
                                <InputGroupText>EUR</InputGroupText>
                            </InputGroupAddon>
                        </InputGroup>
                    </Field>
                )
            })}

            <Field orientation="horizontal" className="items-center justify-between gap-4">
                <FieldLabel htmlFor={vatRateId} className="flex-1 text-ds-fg text-sm">
                    VAT percentage
                </FieldLabel>
                <InputGroup size="sm" className="w-44">
                    <InputGroupAddon align="inline-start">
                        <InputGroupText>%</InputGroupText>
                    </InputGroupAddon>
                    <InputGroupInput
                        id={vatRateId}
                        type="text"
                        inputMode="numeric"
                        value={quoteData.vatRate}
                        onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9]/g, "")
                            onVatRateChange(Number(value) || 0)
                        }}
                        placeholder="0"
                    />
                </InputGroup>
            </Field>
        </div>
    )
})
