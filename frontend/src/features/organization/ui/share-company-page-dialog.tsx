import { Suspense } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { LazyDialogBodySpinner } from "@/shared/ui/lazy-dialog-body-spinner"
import { LazyShareCompanyPageDialogContent } from "./share-company-page-dialog-lazy-content"

interface ShareCompanyPageDialogProps {
    isOpen: boolean
    onClose: () => void
    currentUrl?: string
    organizationId?: string
    organizationSlug?: string
}

export function ShareCompanyPageDialog({
    isOpen,
    onClose,
    currentUrl,
    organizationId,
    organizationSlug,
}: ShareCompanyPageDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-2xl" onOpenAutoFocus={(e) => e.preventDefault()}>
                <DialogHeader className="border-b">
                    <DialogTitle>Share company page</DialogTitle>
                    <DialogDescription>
                        Share your company page with prospects and partners.
                    </DialogDescription>
                </DialogHeader>

                <Suspense fallback={<LazyDialogBodySpinner label="Loading sharing options..." />}>
                    <LazyShareCompanyPageDialogContent
                        isOpen={isOpen}
                        onClose={onClose}
                        currentUrl={currentUrl}
                        organizationId={organizationId}
                        organizationSlug={organizationSlug}
                    />
                </Suspense>
            </DialogContent>
        </Dialog>
    )
}
