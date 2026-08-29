import { CreditCard } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
// TODO_i18n_review: card-brand labels, payment status labels, and SEPA copy still
// come from shared lib helpers and remain English; broader payment-method i18n
// pass needs follow-up.
import { useOrg } from "@/entities/organization"
import { useIdlePreload } from "@/shared/lib/performance/use-idle-preload"
import { Button } from "@/shared/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { Skeleton } from "@/shared/ui/skeleton"
import { ToastPill } from "@/shared/ui/toast-pill"
import { useCurrentSubscription, usePaymentMethod } from "../api/subscription.api"
import {
    computePaymentMethodState,
    type PaymentMethodState,
    paymentMethodStateNeedsAction,
} from "../lib/payment-method-status"
import { getQueryErrorMessage } from "../lib/query-error"
import { PaymentMethodPanel } from "./payment-method-panel"
import { UpdatePaymentMethodDialog } from "./update-payment-method-dialog"
import { preloadUpdatePaymentMethodDialogContent } from "./update-payment-method-dialog-preload"

export function PaymentMethodCard() {
    const { t } = useTranslation("settings")
    const { t: tCommon } = useTranslation("common")
    const [dialogOpen, setDialogOpen] = useState(false)
    const { state: orgState } = useOrg()
    const organizationId = orgState.org.id

    const subscriptionQuery = useCurrentSubscription(organizationId)
    const paymentMethodQuery = usePaymentMethod(organizationId)
    const {
        data: subscription,
        error: subscriptionError,
        isLoading: isSubLoading,
        refetch: refetchSubscription,
    } = subscriptionQuery
    const {
        data: paymentMethodData,
        error: paymentMethodError,
        isLoading: isPmLoading,
        refetch: refetchPaymentMethod,
    } = paymentMethodQuery
    const paymentMethodDialogPreload = useIdlePreload(preloadUpdatePaymentMethodDialogContent, {
        enabled: !isSubLoading && !isPmLoading,
    })

    if (isSubLoading) return <PaymentMethodCardSkeleton />
    if (isPmLoading) return <PaymentMethodCardSkeleton />

    if (!subscription || !paymentMethodData) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{t("paymentMethod.title")}</CardTitle>
                    <CardDescription>{t("paymentMethod.description")}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-center p-6">
                    <ToastPill
                        variant="error"
                        message={getQueryErrorMessage(
                            paymentMethodError ?? subscriptionError,
                            t("paymentMethod.loadError")
                        )}
                        action={{
                            label: tCommon("action.retry"),
                            onClick: () => {
                                void refetchSubscription()
                                void refetchPaymentMethod()
                            },
                        }}
                        onDismiss={() => undefined}
                    />
                </CardContent>
            </Card>
        )
    }

    const paymentMethod = paymentMethodData?.paymentMethod ?? null
    const mode = paymentMethod ? "update" : "add"
    const state: PaymentMethodState = paymentMethod
        ? computePaymentMethodState(paymentMethod, subscription)
        : "ok"
    const needsAction = paymentMethodStateNeedsAction(state)

    return (
        <>
            <Card>
                <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                            <CardTitle>Payment method</CardTitle>
                            <CardDescription>
                                Used for your recurring subscription charges.
                            </CardDescription>
                        </div>
                        <Button
                            variant="solid"
                            size="sm"
                            radius="full"
                            onClick={() => {
                                void paymentMethodDialogPreload.preload()
                                setDialogOpen(true)
                            }}
                            onFocus={() => void paymentMethodDialogPreload.preload()}
                            onPointerDown={() => void paymentMethodDialogPreload.preload()}
                            onPointerEnter={() => void paymentMethodDialogPreload.preload()}
                        >
                            {paymentMethod
                                ? needsAction
                                    ? t("paymentMethod.updateNowAction")
                                    : t("paymentMethod.updateAction")
                                : t("paymentMethod.addAction")}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    {paymentMethod ? (
                        <PaymentMethodPanel paymentMethod={paymentMethod} state={state} />
                    ) : (
                        <EmptyPanel />
                    )}
                </CardContent>
            </Card>

            {dialogOpen && (
                <UpdatePaymentMethodDialog
                    open
                    onOpenChange={setDialogOpen}
                    mode={mode}
                    organizationId={organizationId}
                />
            )}
        </>
    )
}

function EmptyPanel() {
    const { t } = useTranslation("settings")
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon">
                    <CreditCard strokeWidth={2} />
                </EmptyMedia>
                <EmptyTitle>{t("paymentMethod.emptyTitle")}</EmptyTitle>
            </EmptyHeader>
        </Empty>
    )
}

function PaymentMethodCardSkeleton() {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                    <Skeleton className="h-8 w-24 rounded-full" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex items-center justify-between gap-4 rounded-[10px] border border-ds-surface-border px-[18px] py-4">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-8 rounded-sm" />
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-3 w-24" />
                </div>
            </CardContent>
        </Card>
    )
}
