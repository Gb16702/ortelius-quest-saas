import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { Invitation, InvitationsQueryData } from "@/entities/invitation"
import { invitationsKeys } from "@/entities/invitation"
import { restorePreviousQueries } from "./member-mutation.cache"
import { parseMemberMutationResponse } from "./member-mutation.response"
import { isFulfilledMutationResult } from "./member-mutation-result"

export function useSendInvitations(orgId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (
            invitations: Array<{ email: string; role: string; message?: string }>
        ) => {
            const results = await Promise.allSettled(
                invitations.map(async (invitation) => {
                    const res = await fetch(`/api/organizations/${orgId}/invitations`, {
                        method: "POST",
                        credentials: "include",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: invitation.email,
                            role: invitation.role,
                            organizationId: orgId,
                        }),
                    })

                    return parseMemberMutationResponse(res, "Failed to send invitation")
                })
            )

            const failed = results.filter((result) => result.status === "rejected")
            if (failed.length > 0) {
                throw new Error(
                    failed.length === invitations.length
                        ? "Failed to send invitations"
                        : `Sent ${invitations.length - failed.length} invitation${
                              invitations.length - failed.length === 1 ? "" : "s"
                          }, ${failed.length} failed`
                )
            }

            return results.filter(isFulfilledMutationResult).map((result) => result.value)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: invitationsKeys.lists(orgId) })
        },
    })
}

export function useResendInvitation(orgId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (invitationId: string) => {
            const res = await fetch(`/api/organizations/invitation/${invitationId}/resend`, {
                method: "POST",
                credentials: "include",
            })

            return parseMemberMutationResponse(res, "Failed to resend invitation")
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
                                ? { ...invitation, lastSentAt: new Date().toISOString() }
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
