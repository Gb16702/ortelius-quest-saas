import { useState } from "react"
import { useTranslation } from "react-i18next"
import { useOrg } from "@/entities/organization"
import { Button } from "@/shared/ui/button"
import { Skeleton } from "@/shared/ui/skeleton"
import { Stack, StackDescription, StackItem, StackTitle } from "@/shared/ui/stack"
import { useCurrentSubscription, usePlans } from "../api/subscription.api"
import { CancelSubscriptionDialog } from "./cancel-subscription-dialog"

export function CancelSubscriptionCard() {
    const { t } = useTranslation("settings")
    const [dialogOpen, setDialogOpen] = useState(false)
    const { state } = useOrg()
    const organizationId = state.org.id
    const { data: subscription, isLoading: isSubLoading } = useCurrentSubscription(organizationId)
    const { data: plansData, isLoading: arePlansLoading } = usePlans()

    if (isSubLoading || arePlansLoading) {
        return <CancelSubscriptionCardSkeleton />
    }

    if (!subscription?.hasActiveSubscription) return null
    if (subscription.cancelAtPeriodEnd) return null

    const currentPlanKey = subscription.plan
    const currentPlan = plansData?.plans.find((p) => p.name === currentPlanKey)
    const planDisplayName = currentPlan?.displayName ?? "Your plan"

    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <h2 className="font-medium text-base text-ds-fg leading-none">
                    {t("billing.sections.danger.title")}
                </h2>
            </div>
            <Stack>
                <StackItem className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                        <StackTitle>{t("subscription.cancel.cardTitle")}</StackTitle>
                        <StackDescription>
                            {t("subscription.cancel.cardDescription")}
                        </StackDescription>
                    </div>
                    <Button
                        variant="danger"
                        size="md"
                        radius="full"
                        onClick={() => setDialogOpen(true)}
                    >
                        {t("subscription.cancel.cancel")}
                    </Button>
                </StackItem>
            </Stack>

            {dialogOpen && (
                <CancelSubscriptionDialog
                    open={true}
                    onOpenChange={setDialogOpen}
                    organizationId={organizationId}
                    planDisplayName={planDisplayName}
                    accessEndsAt={subscription.nextBillingDate}
                />
            )}
        </section>
    )
}

function CancelSubscriptionCardSkeleton() {
    return (
        <section className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-96" />
            </div>
            <Stack>
                <StackItem className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-44" />
                        <Skeleton className="h-4 w-full max-w-xl" />
                    </div>
                    <Skeleton className="h-9 w-44 rounded-full" />
                </StackItem>
            </Stack>
        </section>
    )
}
