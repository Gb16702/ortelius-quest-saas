import { useMutation, useQueryClient } from "@tanstack/react-query"
import { parseEmptySuccessResponse } from "@/shared/api/http.response"

export function useLeaveOrganization(organizationId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/organizations/${organizationId}/members/me`, {
                method: "DELETE",
                credentials: "include",
            })

            await parseEmptySuccessResponse(res, "Failed to leave organization")
        },
        onSuccess: () => {
            queryClient.clear()
        },
    })
}
