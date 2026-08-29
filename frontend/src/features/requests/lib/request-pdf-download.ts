import { showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { downloadRequestPdf } from "../api/request-pdf.api"

export interface DownloadRequestPdfWithToastOptions {
    requestId: string
    requestNumber: string
}

export const downloadRequestPdfWithToast = async ({
    requestId,
    requestNumber,
}: DownloadRequestPdfWithToastOptions): Promise<void> => {
    try {
        await downloadRequestPdf({ requestId, requestNumber })
        showSuccessToast("PDF downloaded")
    } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to download PDF"
        showRetryErrorToast(message, {
            onRetry: () => {
                downloadRequestPdfWithToast({ requestId, requestNumber })
            },
        })
    }
}
