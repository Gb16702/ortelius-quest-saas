import { getResponseErrorMessage, readJsonResponse } from "@/shared/api/http.response"

export interface DownloadPdfOptions {
    requestId: string
    requestNumber: string
}

export async function downloadRequestPdf({
    requestId,
    requestNumber,
}: DownloadPdfOptions): Promise<void> {
    try {
        const res = await fetch(`/api/pdf/request/${requestId}`, {
            credentials: "include",
        })

        if (!res.ok) {
            const json = await readJsonResponse(res)
            throw new Error(getResponseErrorMessage(json, "Failed to download PDF"))
        }

        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.style.display = "none"
        a.href = url
        a.download = `request-${requestNumber}.pdf`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
    } catch (error) {
        console.error("Error downloading PDF:", error)
        throw error
    }
}
