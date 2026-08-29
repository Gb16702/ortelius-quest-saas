import { useQueryClient } from "@tanstack/react-query"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import type { Role } from "@/entities/access"
import { useOrganizationMembers } from "@/entities/member"
import { useOrg } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import {
    invalidateMemberDmConversationLists,
    resolveMemberDmConversation,
    sendChatMessage,
} from "@/features/chat"
import {
    createSharedRequestMessage,
    RequestsPageContent,
    RequestsPageProvider,
    type ShareRequestDestination,
    ShareRequestDialog,
    type ShareRequestMember,
    type UserRequest,
    useShareToTeamChat,
} from "@/features/requests"
import { showPendingToast, showRetryErrorToast, showSuccessToast } from "@/shared/ui/toasts"

interface OrgRequestsPageProps {
    sessionData: SessionResponse | null
    currentUserRole: Role
}

export function OrgRequestsPage({ sessionData, currentUserRole }: OrgRequestsPageProps) {
    const { t } = useTranslation("requests")
    const { meta, state } = useOrg()
    const queryClient = useQueryClient()
    const [requestToShare, setRequestToShare] = useState<UserRequest | null>(null)
    const runShareRequestRef = useRef<
        (request: UserRequest, destinations: ShareRequestDestination[]) => void
    >(() => {})
    const organizationId = sessionData?.session?.activeOrganizationId ?? ""
    const currentUserId = sessionData?.user?.id ?? ""
    const shareToTeamChatMutation = useShareToTeamChat()
    const membersQuery = useOrganizationMembers(organizationId, {
        enabled: Boolean(requestToShare && organizationId),
    })
    const members = useMemo<ShareRequestMember[]>(
        () =>
            (membersQuery.data ?? []).map((member) => ({
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
                image: member.user.image,
            })),
        [membersQuery.data]
    )
    const shareToMember = useCallback(
        async (request: UserRequest, memberId: string) => {
            const conversation = await resolveMemberDmConversation({
                organizationId,
                targetUserId: memberId,
            })
            const sharedRequestMessage = createSharedRequestMessage({
                actorName: sessionData?.user?.name,
                fallbackActorName: t("share.someone", { defaultValue: "Someone" }),
                requestId: request.id,
                requestNumber: request.reqNumber,
            })

            await sendChatMessage({
                conversationId: conversation.conversationId,
                messageType: "system",
                ...sharedRequestMessage,
            })

            invalidateMemberDmConversationLists({
                queryClient,
                userId: currentUserId,
                organizationId,
                organizationSlug: meta.slug,
            })

            return conversation.conversationId
        },
        [currentUserId, meta.slug, organizationId, queryClient, sessionData?.user?.name, t]
    )

    const closeShareDialog = useCallback(() => {
        setRequestToShare(null)
    }, [])

    const runShareRequest = useCallback(
        (request: UserRequest, destinations: ShareRequestDestination[]) => {
            if (!organizationId || destinations.length === 0) return

            const pendingToastId = showPendingToast(
                t("share.toastPending", { defaultValue: "Sharing request..." })
            )
            const shareJobs = destinations.map(async (destination) => {
                if (destination.type === "team-chat") {
                    const response = await shareToTeamChatMutation.mutateAsync(request.id)
                    return {
                        destination,
                        conversationId: response.data.conversationId,
                    }
                }

                const conversationId = await shareToMember(request, destination.memberId)
                return {
                    destination,
                    conversationId,
                }
            })

            void Promise.allSettled(shareJobs).then((results) => {
                const successCount = results.filter(
                    (result) => result.status === "fulfilled"
                ).length
                const failedCount = results.length - successCount
                const firstSuccess = results.find((result) => result.status === "fulfilled")

                if (successCount === 0) {
                    showRetryErrorToast(
                        t("share.toastFailed", {
                            defaultValue: "Failed to share request",
                        }),
                        {
                            onRetry: () => runShareRequestRef.current(request, destinations),
                        },
                        { id: pendingToastId }
                    )
                    return
                }

                const action =
                    successCount === 1 && firstSuccess?.status === "fulfilled"
                        ? {
                              label:
                                  firstSuccess.value.destination.type === "team-chat"
                                      ? t("share.viewTeamChat", {
                                            defaultValue: "View team chat",
                                        })
                                      : t("share.viewMemberChat", {
                                            defaultValue: "View member DM",
                                        }),
                              href: `/org/${meta.slug}/chat/${encodeURIComponent(firstSuccess.value.conversationId)}`,
                          }
                        : undefined

                showSuccessToast(
                    failedCount > 0
                        ? t("share.toastPartialSuccess", {
                              defaultValue:
                                  "Shared to {{successCount}} destinations, failed for {{failedCount}}",
                              successCount,
                              failedCount,
                          })
                        : t("share.toastSuccess", {
                              defaultValue: "Request shared to {{count}} destinations",
                              defaultValue_one: "Request shared to {{count}} destination",
                              count: successCount,
                          }),
                    {
                        id: pendingToastId,
                        action,
                    }
                )
            })
        },
        [meta.slug, organizationId, shareToMember, shareToTeamChatMutation, t]
    )

    useEffect(() => {
        runShareRequestRef.current = runShareRequest
    }, [runShareRequest])

    const shareRequest = useCallback(
        (destinations: ShareRequestDestination[]) => {
            if (!requestToShare) return
            runShareRequest(requestToShare, destinations)
        },
        [requestToShare, runShareRequest]
    )

    return (
        <>
            <RequestsPageProvider
                sessionData={sessionData}
                scope="organization"
                basePath={`/org/${meta.slug}`}
                currentUserRole={currentUserRole}
                onShareRequest={setRequestToShare}
            >
                <RequestsPageContent />
            </RequestsPageProvider>
            <ShareRequestDialog
                isOpen={Boolean(requestToShare)}
                onClose={closeShareDialog}
                organization={{
                    name: state.org.name,
                    logo: state.org.logo,
                }}
                members={members}
                requestNumber={requestToShare?.reqNumber ?? ""}
                currentUserId={currentUserId}
                isLoadingMembers={membersQuery.isLoading}
                onShare={shareRequest}
            />
        </>
    )
}
