import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { MembersQueryData, OrganizationMember } from "@/entities/member"
import { membersKeys } from "@/entities/member"
import { restorePreviousQueries } from "./member-mutation.cache"
import { parseMemberMutationResponse } from "./member-mutation.response"

export function useRemoveMember(orgId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async (memberId: string) => {
            const res = await fetch(`/api/organizations/${orgId}/members/${memberId}`, {
                method: "DELETE",
                credentials: "include",
            })

            return parseMemberMutationResponse(res, "Failed to remove member")
        },
        onMutate: async (memberId) => {
            await queryClient.cancelQueries({ queryKey: membersKeys.lists(orgId) })

            const previousData = queryClient.getQueriesData({
                queryKey: membersKeys.lists(orgId),
            })

            queryClient.setQueriesData(
                { queryKey: membersKeys.lists(orgId) },
                (oldData: MembersQueryData | undefined) => {
                    if (!oldData?.members) return oldData

                    return {
                        ...oldData,
                        members: oldData.members.filter(
                            (member: OrganizationMember) => member.id !== memberId
                        ),
                        pagination: oldData.pagination
                            ? {
                                  ...oldData.pagination,
                                  total: Math.max(0, oldData.pagination.total - 1),
                              }
                            : undefined,
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
            queryClient.invalidateQueries({ queryKey: membersKeys.lists(orgId) })
            queryClient.invalidateQueries({ queryKey: membersKeys.directory(orgId) })
        },
    })
}
