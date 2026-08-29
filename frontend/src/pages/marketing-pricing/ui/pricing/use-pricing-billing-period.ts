import { useCallback, useEffect, useState } from "react"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    type PricingBillingPeriod,
    pricingBillingPeriodSchema,
} from "../../model/pricing-billing-period.schema"

interface PricingBillingPeriodState {
    billingPeriod: PricingBillingPeriod
    setBillingPeriod: (period: PricingBillingPeriod) => void
}

export function usePricingBillingPeriod(): PricingBillingPeriodState {
    const [billingPeriod, setBillingPeriodState] = useState<PricingBillingPeriod>(
        readBillingPeriodFromLocation
    )

    useEffect(() => {
        const rawBillingPeriod = readRawBillingPeriodFromLocation()
        if (rawBillingPeriod === null) return

        const result = safeParseSchema(pricingBillingPeriodSchema, rawBillingPeriod)
        if (!result.success) {
            replaceBillingPeriodInLocation("yearly")
            setBillingPeriodState("yearly")
        }
    }, [])

    useEffect(() => {
        const handlePopState = () => {
            setBillingPeriodState(readBillingPeriodFromLocation())
        }

        window.addEventListener("popstate", handlePopState)
        return () => window.removeEventListener("popstate", handlePopState)
    }, [])

    const setBillingPeriod = useCallback((period: PricingBillingPeriod) => {
        const parsedPeriod = parseSchema(pricingBillingPeriodSchema, period)
        pushBillingPeriodToLocation(parsedPeriod)
        setBillingPeriodState(parsedPeriod)
    }, [])

    return { billingPeriod, setBillingPeriod }
}

function readRawBillingPeriodFromLocation(): string | null {
    if (typeof window === "undefined") return null
    return new URLSearchParams(window.location.search).get("billing")
}

function readBillingPeriodFromLocation(): PricingBillingPeriod {
    const rawBillingPeriod = readRawBillingPeriodFromLocation()
    const result = safeParseSchema(pricingBillingPeriodSchema, rawBillingPeriod)
    return result.success ? result.data : "yearly"
}

function pushBillingPeriodToLocation(period: PricingBillingPeriod): void {
    if (typeof window === "undefined") return
    updateBillingPeriodInLocation(period, "pushState")
}

function replaceBillingPeriodInLocation(period: PricingBillingPeriod): void {
    if (typeof window === "undefined") return
    updateBillingPeriodInLocation(period, "replaceState")
}

function updateBillingPeriodInLocation(
    period: PricingBillingPeriod,
    historyMethod: "pushState" | "replaceState"
): void {
    const nextUrl = new URL(window.location.href)
    if (period === "yearly") {
        nextUrl.searchParams.delete("billing")
    } else {
        nextUrl.searchParams.set("billing", period)
    }

    window.history[historyMethod](window.history.state, "", nextUrl)
}
