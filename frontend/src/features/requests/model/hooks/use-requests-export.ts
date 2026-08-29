import { useCallback, useRef, useState } from "react"
import { exportToCSV } from "@/shared/lib/csv"
import { showErrorToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"
import { fetchRequestsPage, type RequestScopeKey } from "../../api/requests.api"
import type { UserRequest } from "../request"

interface UseRequestsExportOptions {
    totalRequests: number
    statusFilter: string
    assignedToFilter: string
    priorityFilter: string
    search: string
    fromDate: string
    toDate: string
    isOrganizationView: boolean
    requestScope: RequestScopeKey
}

interface UseRequestsExportResult {
    isExporting: boolean
    exportRequests: () => Promise<void>
}

export function useRequestsExport({
    totalRequests,
    statusFilter,
    assignedToFilter,
    priorityFilter,
    search,
    fromDate,
    toDate,
    isOrganizationView,
    requestScope,
}: UseRequestsExportOptions): UseRequestsExportResult {
    const [isExporting, setIsExporting] = useState(false)
    const exportRequestsRef = useRef<(() => Promise<void>) | null>(null)

    const exportRequests = useCallback(async () => {
        if (!totalRequests) {
            showErrorToast("No requests to export")
            return
        }

        setIsExporting(true)
        try {
            const maxLimit = 100
            let allRequests: UserRequest[] = []

            const statusesToFetch =
                statusFilter &&
                statusFilter !== "all" &&
                statusFilter !== "" &&
                statusFilter !== "undefined" &&
                statusFilter !== "EMPTY"
                    ? statusFilter.split(",")
                    : []

            const fetchWithStatus = async (statusValue?: string) => {
                const results: UserRequest[] = []
                let currentPage = 1
                let hasMore = true

                while (hasMore) {
                    const data = await fetchRequestsPage({
                        ...requestScope,
                        page: currentPage,
                        limit: maxLimit,
                        search,
                        lifecycleStatus: statusValue ?? "",
                        closedReason: "",
                        assignedTo: assignedToFilter,
                        priority: priorityFilter,
                        fromDate,
                        toDate,
                    })

                    results.push(...data.requests)
                    hasMore = currentPage < data.pagination.totalPages
                    currentPage++
                }

                return results
            }

            if (statusesToFetch.length > 0) {
                const results = await Promise.all(
                    statusesToFetch.map((statusValue) => fetchWithStatus(statusValue))
                )
                allRequests = results.flat()
            } else {
                allRequests = await fetchWithStatus()
            }

            const uniqueRequests = Array.from(
                new Map(allRequests.map((request) => [request.id, request])).values()
            )

            if (uniqueRequests.length === 0) {
                showErrorToast("No requests to export")
                return
            }

            const csvData = uniqueRequests.map((request: UserRequest) => ({
                "Request Number": request.reqNumber,
                [isOrganizationView ? "Requester" : "Organization"]: isOrganizationView
                    ? request.requester?.name || "Guest"
                    : request.organization?.name || "Unknown",
                Email: isOrganizationView
                    ? request.requester?.email || "N/A"
                    : request.requester?.email || "N/A",
                Status: request.lifecycleStatus,
                "Closed Reason": request.closedReason ?? "",
                Categories: request.categories?.join(", ") || "",
                Services: request.services?.join(", ") || "",
                "From Date": new Date(request.fromDate).toLocaleDateString(),
                "To Date": new Date(request.toDate).toLocaleDateString(),
                "Created At": new Date(request.createdAt).toLocaleDateString(),
            }))

            const timestamp = new Date().toISOString().split("T")[0]
            exportToCSV(csvData, `requests-${timestamp}.csv`)
            showSuccessToast(
                `Exported ${uniqueRequests.length} request${uniqueRequests.length > 1 ? "s" : ""}`
            )
        } catch (error) {
            console.error("Export error:", error)
            showRetryErrorToast("Failed to export requests", {
                onRetry: () => {
                    void exportRequestsRef.current?.()
                },
            })
        } finally {
            setIsExporting(false)
        }
    }, [
        totalRequests,
        statusFilter,
        assignedToFilter,
        priorityFilter,
        search,
        fromDate,
        toDate,
        isOrganizationView,
        requestScope,
    ])

    exportRequestsRef.current = exportRequests

    return { isExporting, exportRequests }
}
