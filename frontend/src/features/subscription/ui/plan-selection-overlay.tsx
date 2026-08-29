import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { Suspense } from "react"
import { Button } from "@/shared/ui/button"
import type { BillingInterval, PlanKey } from "../model/subscription"
import { LazyPlanSelectionOverlayContent } from "./plan-selection-overlay-lazy-content"
import { PlanSelectionOverlaySkeleton } from "./plan-selection-overlay-skeleton"

interface PlanSelectionOverlayProps {
    open: boolean
    onClose: () => void
    currentPlanKey: PlanKey | null
    organizationId: string
    initialBillingInterval?: BillingInterval
}

export function PlanSelectionOverlay({
    open,
    onClose,
    currentPlanKey,
    organizationId,
    initialBillingInterval,
}: PlanSelectionOverlayProps) {
    return (
        <DialogPrimitive.Root
            open={open}
            modal={false}
            onOpenChange={(next) => {
                if (!next) onClose()
            }}
        >
            <DialogPrimitive.Portal>
                <div aria-hidden className="fixed inset-0 z-[60] bg-ds-surface" />
                <DialogPrimitive.Content className="fixed inset-0 z-[60] overflow-y-auto bg-ds-surface outline-none">
                    <DialogPrimitive.Title className="sr-only">
                        Manage your plan
                    </DialogPrimitive.Title>

                    <div className="sticky top-0 z-10 flex items-center justify-end bg-ds-surface px-6 py-4">
                        <DialogPrimitive.Close asChild>
                            <Button
                                type="button"
                                aria-label="Close"
                                variant="outline"
                                size="icon-sm"
                                radius="full"
                            >
                                <X />
                            </Button>
                        </DialogPrimitive.Close>
                    </div>

                    <div className="mx-auto w-full max-w-6xl px-6 pt-16 pb-16">
                        <h1 className="mb-10 text-center font-medium text-3xl text-ds-fg">
                            Manage your plan
                        </h1>

                        <Suspense fallback={<PlanSelectionOverlaySkeleton />}>
                            <LazyPlanSelectionOverlayContent
                                onClose={onClose}
                                currentPlanKey={currentPlanKey}
                                organizationId={organizationId}
                                initialBillingInterval={initialBillingInterval}
                            />
                        </Suspense>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    )
}
