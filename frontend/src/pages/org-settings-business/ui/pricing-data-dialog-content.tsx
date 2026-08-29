import {
    PricingDataDialogFooter,
    PricingIntelligenceContent,
    PricingIntelligenceProvider,
} from "@/features/pricing-intelligence"
import { DialogBody } from "@/shared/ui/dialog"

interface PricingDataDialogContentProps {
    organizationId: string | null
    onClose: () => void
}

export function PricingDataDialogContent({
    organizationId,
    onClose,
}: PricingDataDialogContentProps) {
    return (
        <PricingIntelligenceProvider organizationId={organizationId}>
            <DialogBody>
                <PricingIntelligenceContent />
            </DialogBody>
            <PricingDataDialogFooter onClose={onClose} />
        </PricingIntelligenceProvider>
    )
}
