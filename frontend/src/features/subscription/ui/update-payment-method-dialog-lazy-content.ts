import { preloadableLazy } from "@/shared/lib/performance/preloadable-lazy"

export const LazyUpdatePaymentMethodDialogContent = preloadableLazy(() =>
    import("./update-payment-method-dialog-content").then((module) => ({
        default: module.UpdatePaymentMethodDialogContent,
    }))
)
