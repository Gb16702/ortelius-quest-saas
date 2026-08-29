import { downloadRequestPdfWithToast } from "../../lib/request-pdf-download"
import type { UserRequest } from "../request"

export function useRequestActions() {
    const downloadPdf = (request: UserRequest) => {
        void downloadRequestPdfWithToast({
            requestId: request.id,
            requestNumber: request.reqNumber,
        })
    }

    return {
        downloadPdf,
    }
}
