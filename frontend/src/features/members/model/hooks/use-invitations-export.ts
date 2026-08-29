import { useCallback, useRef, useState } from "react"
import type { Invitation } from "@/entities/invitation"
import { createInvitationsListSearchParams, parseInvitationsResponse } from "@/entities/invitation"
import { readJsonResponse } from "@/shared/api/http.response"
import { exportToCSV } from "@/shared/lib/csv"
import { showErrorToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"

interface UseInvitationsExportOptions {
    totalInvitations: number
    search: string
    role: string
    status: string
    organizationId: string
}

interface UseInvitationsExportResult {
    isExporting: boolean
    exportInvitations: () => Promise<void>
}

export function useInvitationsExport({
    totalInvitations,
    search,
    role,
    status,
    organizationId,
}: UseInvitationsExportOptions): UseInvitationsExportResult {
    const [isExporting, setIsExporting] = useState(false)
    const exportInvitationsRef = useRef<() => Promise<void>>(async () => {})

    const exportInvitations = useCallback(async () => {
        if (!totalInvitations) {
            showErrorToast("No invitations to export")
            return
        }

        setIsExporting(true)
        try {
            const maxLimit = 100
            let allInvitations: Invitation[] = []

            const statusesToFetch =
                status &&
                status !== "all" &&
                status !== "" &&
                status !== "undefined" &&
                status !== "EMPTY"
                    ? status.split(",")
                    : []

            const fetchWithStatus = async (statusValue?: string) => {
                const totalPages = Math.ceil(totalInvitations / maxLimit)
                const results: Invitation[] = []

                for (let currentPage = 1; currentPage <= totalPages; currentPage++) {
                    const params = createInvitationsListSearchParams({
                        page: currentPage,
                        limit: maxLimit,
                        search,
                        role: "",
                        status: statusValue ?? "",
                    })

                    const response = await fetch(
                        `/api/organizations/${organizationId}/invitations?${params}`,
                        { credentials: "include" }
                    )

                    if (!response.ok) {
                        throw new Error("Failed to fetch invitations")
                    }

                    const data = await readJsonResponse(response)
                    const pageInvitations = parseInvitationsResponse(data, {
                        page: currentPage,
                        limit: maxLimit,
                    }).invitations
                    results.push(...pageInvitations)
                }

                return results
            }

            if (statusesToFetch.length > 0) {
                for (const statusValue of statusesToFetch) {
                    const fetched = await fetchWithStatus(statusValue)
                    allInvitations.push(...fetched)
                }
            } else {
                allInvitations = await fetchWithStatus()
            }

            const uniqueInvitations = Array.from(
                new Map(allInvitations.map((invitation) => [invitation.id, invitation])).values()
            )

            let filteredInvitations = uniqueInvitations

            if (role && role !== "all" && role !== "" && role !== "undefined" && role !== "EMPTY") {
                const roleFilter = role.split(",")
                filteredInvitations = filteredInvitations.filter((invitation: Invitation) =>
                    roleFilter.includes(invitation.role.toLowerCase())
                )
            }

            if (filteredInvitations.length === 0) {
                showErrorToast("No invitations to export")
                return
            }

            const csvData = filteredInvitations.map((invitation: Invitation) => ({
                Email: invitation.email,
                Role: invitation.role,
                Status: invitation.status,
                "Invited By": invitation.inviterName,
                "Expires At": new Date(invitation.expiresAt).toLocaleDateString(),
            }))

            const timestamp = new Date().toISOString().split("T")[0]
            exportToCSV(csvData, `invitations-${timestamp}.csv`)
            showSuccessToast(
                `Exported ${filteredInvitations.length} invitation${filteredInvitations.length > 1 ? "s" : ""}`
            )
        } catch (error) {
            console.error("Export error:", error)
            showRetryErrorToast("Failed to export invitations", {
                onRetry: () => {
                    void exportInvitationsRef.current()
                },
            })
        } finally {
            setIsExporting(false)
        }
    }, [totalInvitations, search, role, status, organizationId])

    exportInvitationsRef.current = exportInvitations

    return { isExporting, exportInvitations }
}
