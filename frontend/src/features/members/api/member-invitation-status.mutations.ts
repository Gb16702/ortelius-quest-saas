import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Invitation, InvitationsQueryData } from "@/entities/invitation"
import { invitationsKeys } from "@/entities/invitation"
import { restorePreviousQueries } from "./member-mutation.cache"
import { parseMemberMutationResponse } from "./member-mutation.response"

export function useCancelInvitation(orgId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (invitationId: string) => {
            const res = await fetch(`/api/organizations/invitation/${invitationId}/cancel`, {
                method: "POST",
                credentials: "include",
            })

            return parseMemberMutationResponse(res, "Failed to cancel invitation")
        },
        onMutate: async (invitationId) => {
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
                            invitation.id === invitationId
                                ? {
                                      ...invitation,
                                      status: "canceled",
                                      canceledAt: new Date().toISOString(),
                                  }
                                : invitation
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

export function useBulkCancelInvitations(orgId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (invitationIds: string[]) => {
            const res = await fetch(`/api/organizations/${orgId}/invitations/cancel`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ invitationIds }),
            })

            return parseMemberMutationResponse(res, "Failed to cancel invitations")
        },
        onMutate: async (invitationIds) => {
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
                            invitationIds.includes(invitation.id) && invitation.status === "pending"
                                ? { ...invitation, status: "canceled" }
                                : invitation
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
