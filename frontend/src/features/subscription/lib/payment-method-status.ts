import type { CurrentSubscription, PaymentMethod } from "../model/subscription"

export type PaymentMethodState = "ok" | "expiring" | "expired" | "failed"

const EXPIRING_SOON_THRESHOLD_DAYS = 30

export function computePaymentMethodState(
    paymentMethod: PaymentMethod,
    subscription: CurrentSubscription | undefined,
    now: Date = new Date()
): PaymentMethodState {
    if (subscription?.status === "past_due" || subscription?.status === "unpaid") {
        return "failed"
    }

    if (paymentMethod.type !== "card") return "ok"
    const { expMonth, expYear } = paymentMethod
    if (!expMonth || !expYear) return "ok"

    const expiry = new Date(expYear, expMonth, 0, 23, 59, 59)
    if (expiry.getTime() < now.getTime()) return "expired"

    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (daysUntilExpiry <= EXPIRING_SOON_THRESHOLD_DAYS) return "expiring"

    return "ok"
}

export function getPaymentMethodStatusLabel(state: PaymentMethodState): string | null {
    switch (state) {
        case "expiring":
            return "Expires soon"
        case "expired":
            return "Card expired"
        case "failed":
            return "Last payment failed"
        default:
            return null
    }
}

export function paymentMethodStateNeedsAction(state: PaymentMethodState): boolean {
    return state === "expired" || state === "failed"
}
