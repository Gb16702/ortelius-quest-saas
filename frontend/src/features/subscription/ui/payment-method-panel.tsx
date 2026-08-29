import { cn } from "@/shared/lib/class-names"
import { brandNeedsBorder, CARD_BRAND_LABELS } from "../lib/payment-brand"
import { getPaymentMethodStatusLabel, type PaymentMethodState } from "../lib/payment-method-status"
import type { PaymentMethod } from "../model/subscription"
import { BrandLogo } from "./payment-brand-logo"

interface PaymentMethodPanelProps {
    paymentMethod: PaymentMethod
    state: PaymentMethodState
    className?: string
}

export function PaymentMethodPanel({ paymentMethod, state, className }: PaymentMethodPanelProps) {
    const statusLabel = getPaymentMethodStatusLabel(state)

    if (paymentMethod.type === "card") {
        const brandLabel =
            CARD_BRAND_LABELS[paymentMethod.brand] ??
            paymentMethod.brand.charAt(0).toUpperCase() + paymentMethod.brand.slice(1)
        const expiry =
            paymentMethod.expMonth && paymentMethod.expYear
                ? `${paymentMethod.expMonth.toString().padStart(2, "0")} / ${paymentMethod.expYear.toString().slice(-2)}`
                : null

        return (
            <div
                className={cn(
                    "flex items-center justify-between gap-4 rounded-[10px] border border-ds-surface-border bg-gradient-to-b from-ds-surface to-ds-canvas px-[18px] py-4",
                    className
                )}
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div
                        className={cn(
                            "h-8 w-8 shrink-0 overflow-hidden rounded-sm transition-opacity",
                            brandNeedsBorder(paymentMethod.brand) &&
                                "border border-ds-surface-border",
                            state === "expired" && "opacity-55"
                        )}
                    >
                        <BrandLogo brand={paymentMethod.brand} className="h-full w-full" />
                    </div>
                    <div className="flex min-w-0 items-center gap-2.5">
                        <span
                            className={cn(
                                "font-semibold text-ds-fg text-sm",
                                state === "expired" && "line-through decoration-ds-fg-muted"
                            )}
                        >
                            {brandLabel}
                        </span>
                        <span className="font-mono text-[13px] text-ds-fg">
                            •••• {paymentMethod.last4}
                        </span>
                    </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                    {expiry && <span className="text-ds-fg-muted text-xs">Expires {expiry}</span>}
                    {statusLabel && <StatusChip state={state} label={statusLabel} />}
                </div>
            </div>
        )
    }

    return (
        <div
            className={cn(
                "flex items-center justify-between gap-4 rounded-[10px] border border-ds-surface-border bg-gradient-to-b from-ds-surface to-ds-canvas px-[18px] py-4",
                className
            )}
        >
            <div className="flex min-w-0 items-center gap-3">
                <div className="h-8 w-8 shrink-0 overflow-hidden rounded-sm">
                    <BrandLogo brand="generic" className="h-full w-full" />
                </div>
                <div className="flex min-w-0 items-center gap-2.5">
                    <span className="font-semibold text-ds-fg text-sm">SEPA Direct Debit</span>
                    <span className="font-mono text-[13px] text-ds-fg">
                        •••• {paymentMethod.last4}
                    </span>
                </div>
            </div>
            {paymentMethod.bankCode && (
                <span className="shrink-0 text-ds-fg-muted text-xs">{paymentMethod.bankCode}</span>
            )}
        </div>
    )
}

interface StatusChipProps {
    state: PaymentMethodState
    label: string
}

function StatusChip({ state, label }: StatusChipProps) {
    const tone: "warn" | "danger" = state === "expiring" ? "warn" : "danger"
    const toneClasses =
        tone === "warn"
            ? "bg-ds-amber-100 text-ds-amber-900"
            : "bg-ds-danger-soft text-ds-danger-text"
    const dotClasses = tone === "warn" ? "bg-ds-amber-900" : "bg-ds-danger-solid"

    return (
        <span
            className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 font-medium text-[11.5px]",
                toneClasses
            )}
        >
            <span className={cn("h-1.5 w-1.5 rounded-full", dotClasses)} />
            {label}
        </span>
    )
}
