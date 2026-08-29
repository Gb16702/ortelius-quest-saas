import { useCallback, useRef, useState } from "react"
import { parseMembersResponse } from "@/entities/member"
import { readJsonResponse } from "@/shared/api/http.response"
import { exportToCSV } from "@/shared/lib/csv"
import { showErrorToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"

interface UseMembersExportOptions {
    totalMembers: number
    search: string
    role: string
    organizationId: string
}

interface UseMembersExportResult {
    isExporting: boolean
    exportMembers: () => Promise<void>
}

export function useMembersExport({
    totalMembers,
    search,
    role,
    organizationId,
}: UseMembersExportOptions): UseMembersExportResult {
    const [isExporting, setIsExporting] = useState(false)
    const exportMembersRef = useRef<() => Promise<void>>(async () => {})

    const exportMembers = useCallback(async () => {
        if (!totalMembers) {
            showErrorToast("No members to export")
            return
        }

        setIsExporting(true)
        try {
            const maxLimit = 100
            const totalPages = Math.ceil(totalMembers / maxLimit)

            const pageResults = await Promise.all(
                Array.from({ length: totalPages }, (_, i) => {
                    const pageNum = i + 1
                    const params = new URLSearchParams({
                        page: pageNum.toString(),
                        limit: maxLimit.toString(),
                    })

                    if (search) params.set("search", search)

                    if (role && role !== "all" && role !== "" && role !== "undefined") {
                        params.set("role", role)
                    }

                    return fetch(`/api/organizations/${organizationId}/members?${params}`, {
                        credentials: "include",
                    }).then(async (response) => {
                        if (!response.ok) throw new Error("Failed to fetch members")
                        const data = await readJsonResponse(response)
                        return parseMembersResponse(data, {
                            page: pageNum,
                            limit: maxLimit,
                        }).members
                    })
                })
            )

            let allMembers = pageResults.flat()

            if (role && role !== "all" && role !== "" && role !== "undefined" && role !== "EMPTY") {
                const filterRoles = role.split(",")
                allMembers = allMembers.filter((member) =>
                    filterRoles.includes(member.role.toLowerCase())
                )
            }

            if (allMembers.length === 0) {
                showErrorToast("No members to export")
                return
            }

            const csvData = allMembers.map((member) => ({
                Name: member.user.name,
                Email: member.user.email,
                Role: member.role,
                "Joined At": new Date(member.createdAt).toLocaleDateString(),
            }))

            const timestamp = new Date().toISOString().split("T")[0]
            exportToCSV(csvData, `members-${timestamp}.csv`)
            showSuccessToast(
                `Exported ${allMembers.length} member${allMembers.length > 1 ? "s" : ""}`
            )
        } catch {
            showRetryErrorToast("Failed to export members", {
                onRetry: () => {
                    void exportMembersRef.current()
                },
            })
        } finally {
            setIsExporting(false)
        }
    }, [totalMembers, search, role, organizationId])

    exportMembersRef.current = exportMembers

    return { isExporting, exportMembers }
}
