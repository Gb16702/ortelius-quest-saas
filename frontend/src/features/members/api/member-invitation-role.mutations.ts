import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Invitation, InvitationsQueryData } from "@/entities/invitation"
import { invitationsKeys } from "@/entities/invitation"
import { restorePreviousQueries } from "./member-mutation.cache"
import { parseMemberMutationResponse } from "./member-mutation.response"

export function useUpdateInvitationRole(orgId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ invitationId, role }: { invitationId: string; role: string }) => {
            const res = await fetch(`/api/organizations/invitation/${invitationId}/role`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            })

            return parseMemberMutationResponse(res, "Failed to update invitation role")
        },
        onMutate: async ({ invitationId, role }) => {
            await queryClient.cancelQueries({ queryKey: invitationsKeys.lists(orgId) })

            const previousData = queryClient.getQueriesData({
                queryKey: invitationsKeys.lists(orgId),
            })

            queryClient.setQueriesData(
                { queryKey: invitationsKeys.lists(orgId) },
                (oldData: InvitationsQueryData | undefined) => {
                    if (!oldData?.invitations) return oldData

                    return {
                        ...oldData,
                        invitations: oldData.invitations.map((invitation: Invitation) =>
                            invitation.id === invitationId ? { ...invitation, role } : invitation
                        ),
                    }
                }
            )

            return { previousData }
        },
        onError: (_err, _variables, context) => {
            if (context?.previousData) {
                restorePreviousQueries(queryClient, context.previousData)
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: invitationsKeys.lists(orgId) })
        },
    })
}
