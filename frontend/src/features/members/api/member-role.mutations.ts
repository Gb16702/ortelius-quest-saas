import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { MembersQueryData, OrganizationMember } from "@/entities/member"
import { membersKeys } from "@/entities/member"
import { restorePreviousQueries } from "./member-mutation.cache"
import { parseMemberMutationResponse } from "./member-mutation.response"

export function useUpdateMemberRole(orgId: string) {
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
            const res = await fetch(`/api/organizations/${orgId}/members/${memberId}/role`, {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ role }),
            })

            return parseMemberMutationResponse(res, "Failed to update member role")
        },
        onMutate: async ({ memberId, role }) => {
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
                        members: oldData.members.map((member: OrganizationMember) =>
                            member.id === memberId ? { ...member, role } : member
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
            queryClient.invalidateQueries({ queryKey: membersKeys.lists(orgId) })
            queryClient.invalidateQueries({ queryKey: membersKeys.directory(orgId) })
        },
    })
}
