import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { ROLE_OPTIONS } from "@/entities/access"
import {
    type FavoriteItem,
    type FavoritesResponse,
    favoriteKeys,
    useFavorites,
    useFavoriteToggle,
} from "@/entities/favorite"
import type { InviteForm } from "@/entities/invitation"
import { useOrganizationMembers } from "@/entities/member"
import { OrgProvider } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import {
    invalidateMemberDmConversationLists,
    resolveMemberDmConversation,
    sendChatMessage,
} from "@/features/chat"
import {
    InviteMemberDialog,
    MemberProfileDialogManager,
    useMemberProfileDialog,
    useSendInvitations,
} from "@/features/members"
import { NotificationPopover, useNotifications } from "@/features/notifications"
import {
    LeaveOrganizationDialogManager,
    preloadShareCompanyPageDialogContent,
    ShareCompanyPageDialog,
    useLeaveOrganizationDialog,
} from "@/features/organization"
import {
    createSharedRequestMessage,
    RequestModalManager,
    type ShareRequestDestination,
    ShareRequestDialog,
    type ShareRequestMember,
    type ShareRequestSource,
    useRequestSheet,
    useShareToTeamChat,
} from "@/features/requests"
import { getErrorMessage } from "@/shared/lib/error"
import { useIdlePreload } from "@/shared/lib/performance/use-idle-preload"
import {
    showPendingToast,
    showPromiseToast,
    showRetryErrorToast,
    showSuccessToast,
} from "@/shared/ui/toasts"
import type { OrgLayoutShellData, SidebarNotifications } from "@/widgets/layout"
import { useOrgRouteDataPrefetch } from "../model/use-org-route-data-prefetch"

interface OrgWorkspaceLayoutProps {
    notifications: SidebarNotifications
    onInviteMembers: () => void
    onInviteMembersIntent: () => void
    onShareCompanyPage: () => void
    onShareCompanyPageIntent: () => void
    onViewUserProfile: (userId: string) => void
    onViewUserProfileIntent: () => void
    onRouteDataIntent: (to: string) => void
}

interface OrgWorkspaceIntegrationsProps {
    data: OrgLayoutShellData
    sessionData: SessionResponse | null
    onNavigate?: (href: string) => void
    children: (props: OrgWorkspaceLayoutProps) => ReactNode
}

export function OrgWorkspaceIntegrations({
    data,
    sessionData,
    onNavigate,
    children,
}: OrgWorkspaceIntegrationsProps) {
    return (
        <OrgProvider
            org={data.org}
            role={data.role}
            userId={sessionData?.user?.id}
            slug={data.slug}
        >
            <OrgWorkspaceIntegrationsContent
                data={data}
                sessionData={sessionData}
                onNavigate={onNavigate}
            >
                {children}
            </OrgWorkspaceIntegrationsContent>
        </OrgProvider>
    )
}

function OrgWorkspaceIntegrationsContent({
    data,
    sessionData,
    onNavigate,
    children,
}: OrgWorkspaceIntegrationsProps) {
    const { t } = useTranslation("requests")
    const [shareDialogOpen, setShareDialogOpen] = useState(false)
    const [requestToShare, setRequestToShare] = useState<ShareRequestSource | null>(null)
    const [inviteModalOpen, setInviteModalOpen] = useState(false)
    const runShareRequestRef = useRef<
        (request: ShareRequestSource, destinations: ShareRequestDestination[]) => void
    >(() => {})
    const queryClient = useQueryClient()
    const { openProfile, isOpen: isProfileOpen } = useMemberProfileDialog()
    const { openRequest, isOpen: isRequestOpen } = useRequestSheet()
    const { isOpen: isLeaveOrganizationOpen } = useLeaveOrganizationDialog()
    const { unreadCount } = useNotifications()
    const sendInvitations = useSendInvitations(data.org.id)
    const { prefetchRouteData } = useOrgRouteDataPrefetch({ sessionData })
    const { isPending: isStartingMemberDm, mutateAsync: startMemberDm } = useMutation({
        mutationFn: resolveMemberDmConversation,
    })
    const favoritesQuery = useFavorites(data.org.id)
    const favoriteToggleMutation = useFavoriteToggle()
    const currentUserId = sessionData?.user?.id ?? ""
    const shareToTeamChatMutation = useShareToTeamChat()
    const shareMembersQuery = useOrganizationMembers(data.org.id, {
        enabled: Boolean(requestToShare),
    })
    const shareMembers = useMemo<ShareRequestMember[]>(
        () =>
            (shareMembersQuery.data ?? []).map((member) => ({
                id: member.user.id,
                name: member.user.name,
                email: member.user.email,
                image: member.user.image,
            })),
        [shareMembersQuery.data]
    )

    const shareCompanyPagePreload = useIdlePreload(preloadShareCompanyPageDialogContent, {
        delayMs: 0,
    })

    const preloadInviteMembers = useCallback(() => undefined, [])

    const preloadShareCompanyPage = useCallback(() => {
        void shareCompanyPagePreload.preload()
    }, [shareCompanyPagePreload])

    const preloadMemberProfile = useCallback(() => undefined, [])

    const openInviteMembers = useCallback(() => {
        setInviteModalOpen(true)
    }, [])

    const openShareDialog = useCallback(() => {
        preloadShareCompanyPage()
        setShareDialogOpen(true)
    }, [preloadShareCompanyPage])

    const openUserProfile = useCallback(
        (userId: string) => {
            preloadMemberProfile()
            openProfile(userId)
        },
        [openProfile, preloadMemberProfile]
    )

    const startMemberDmFromProfile = useCallback(
        (targetUserId: string) => {
            const start = async () => {
                const result = await startMemberDm({
                    organizationId: data.org.id,
                    targetUserId,
                })

                onNavigate?.(`/org/${data.slug}/chat/${encodeURIComponent(result.conversationId)}`)
                invalidateMemberDmConversationLists({
                    queryClient,
                    userId: sessionData?.user?.id,
                    organizationId: data.org.id,
                    organizationSlug: data.slug,
                })
            }

            start().catch((error: unknown) => {
                showRetryErrorToast(getErrorMessage(error, "Failed to start member chat"), {
                    onRetry: () => startMemberDmFromProfile(targetUserId),
                })
            })
        },
        [data.org.id, data.slug, onNavigate, queryClient, sessionData?.user?.id, startMemberDm]
    )

    const shareRequestToMember = useCallback(
        async (request: ShareRequestSource, memberId: string) => {
            const conversation = await resolveMemberDmConversation({
                organizationId: data.org.id,
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
                organizationId: data.org.id,
                organizationSlug: data.slug,
            })

            return conversation.conversationId
        },
        [currentUserId, data.org.id, data.slug, queryClient, sessionData?.user?.name, t]
    )

    const runShareRequest = useCallback(
        (request: ShareRequestSource, destinations: ShareRequestDestination[]) => {
            if (destinations.length === 0) return

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

                const conversationId = await shareRequestToMember(request, destination.memberId)
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
                              href: `/org/${data.slug}/chat/${encodeURIComponent(firstSuccess.value.conversationId)}`,
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
        [data.slug, shareRequestToMember, shareToTeamChatMutation, t]
    )

    useEffect(() => {
        runShareRequestRef.current = runShareRequest
    }, [runShareRequest])

    const closeShareRequestDialog = useCallback(() => {
        setRequestToShare(null)
    }, [])

    const shareRequest = useCallback(
        (destinations: ShareRequestDestination[]) => {
            if (!requestToShare) return

            runShareRequest(requestToShare, destinations)
        },
        [requestToShare, runShareRequest]
    )

    const addMemberProfileToFavorites = useCallback(
        (target: { userId: string; name: string; image?: string | null }) => {
            const addFavorite = async () => {
                const createdAt = new Date().toISOString()
                const favorites = queryClient.getQueryData<FavoritesResponse["data"]>(
                    favoriteKeys.list({ organizationId: data.org.id })
                )
                const isAlreadyFavorite = favorites?.favorites.some(
                    (favorite) =>
                        favorite.entityType === "member" && favorite.entityId === target.userId
                )

                if (isAlreadyFavorite) return

                await favoriteToggleMutation.mutateAsync({
                    entityType: "member",
                    entityId: target.userId,
                    isFavorited: false,
                    organizationId: data.org.id,
                    optimisticFavorite: createOptimisticMemberProfileFavorite({
                        userId: target.userId,
                        organizationId: data.org.id,
                        name: target.name,
                        image: target.image,
                        createdAt,
                    }),
                })
            }

            void addFavorite()
        },
        [data.org.id, favoriteToggleMutation, queryClient]
    )

    const getMemberFavorite = useCallback(
        (targetUserId: string) =>
            favoritesQuery.data?.favorites.find(
                (favorite) => favorite.entityType === "member" && favorite.entityId === targetUserId
            ),
        [favoritesQuery.data?.favorites]
    )

    const isMemberProfileFavorite = useCallback(
        (targetUserId: string) => Boolean(getMemberFavorite(targetUserId)),
        [getMemberFavorite]
    )

    const removeMemberProfileFromFavorites = useCallback(
        (target: { userId: string; name: string; image?: string | null }) => {
            const favorite = getMemberFavorite(target.userId)

            if (!favorite) return

            void favoriteToggleMutation.mutateAsync({
                entityType: "member",
                entityId: target.userId,
                isFavorited: true,
                organizationId: data.org.id,
                optimisticFavorite: favorite,
            })
        },
        [data.org.id, favoriteToggleMutation, getMemberFavorite]
    )

    const notifications: SidebarNotifications = {
        unreadCount,
        renderPopover: ({ open, onOpenChange, basePath, children }) => (
            <NotificationPopover open={open} onOpenChange={onOpenChange} basePath={basePath}>
                {children}
            </NotificationPopover>
        ),
    }

    const handleSendInvitations = (forms: InviteForm[]) => {
        const invitations = forms.map((form) => ({ email: form.email.trim(), role: form.role }))
        const isSingle = forms.length === 1
        const promise = sendInvitations.mutateAsync(invitations)

        showPromiseToast(promise, {
            loading: isSingle ? "Sending invitation..." : "Sending invitations...",
            success: isSingle ? "Sent invitation" : "Sent invitations",
            error: (err) => getErrorMessage(err, "Failed to send invitations"),
            successAction: {
                label: "View invitations",
                href: `/org/${data.slug}/team/invitations`,
            },
        })

        void promise.then(
            () => setInviteModalOpen(false),
            () => undefined
        )
    }

    return (
        <>
            {children({
                notifications,
                onInviteMembers: openInviteMembers,
                onInviteMembersIntent: preloadInviteMembers,
                onShareCompanyPage: openShareDialog,
                onShareCompanyPageIntent: preloadShareCompanyPage,
                onViewUserProfile: openUserProfile,
                onViewUserProfileIntent: preloadMemberProfile,
                onRouteDataIntent: prefetchRouteData,
            })}
            {sessionData && isRequestOpen && (
                <RequestModalManager
                    sessionData={sessionData}
                    defaultScope="organization"
                    currentUserRole={data.role}
                    onNavigate={onNavigate}
                    onShareRequest={setRequestToShare}
                />
            )}
            {sessionData && isProfileOpen && (
                <MemberProfileDialogManager
                    sessionData={sessionData}
                    activeOrganization={data.org}
                    onOpenRequest={openRequest}
                    onStartMemberDm={onNavigate ? startMemberDmFromProfile : undefined}
                    onAddMemberToFavorites={addMemberProfileToFavorites}
                    onRemoveMemberFromFavorites={removeMemberProfileFromFavorites}
                    isMemberFavorite={isMemberProfileFavorite}
                    isStartingMemberDm={isStartingMemberDm}
                    isTogglingMemberFavorite={favoriteToggleMutation.isPending}
                />
            )}
            {inviteModalOpen && (
                <InviteMemberDialog
                    isOpen={inviteModalOpen}
                    onClose={() => setInviteModalOpen(false)}
                    organizationId={data.org.id}
                    isInviting={sendInvitations.isPending}
                    availableRoles={ROLE_OPTIONS}
                    onInviteSubmit={handleSendInvitations}
                />
            )}
            {sessionData && isLeaveOrganizationOpen && (
                <LeaveOrganizationDialogManager sessionData={sessionData} />
            )}
            {shareDialogOpen && (
                <ShareCompanyPageDialog
                    isOpen={shareDialogOpen}
                    onClose={() => setShareDialogOpen(false)}
                    currentUrl={
                        typeof window !== "undefined"
                            ? `${window.location.protocol}//${window.location.host}`
                            : ""
                    }
                    organizationId={data.org.id}
                    organizationSlug={data.slug}
                />
            )}
            <ShareRequestDialog
                isOpen={Boolean(requestToShare)}
                onClose={closeShareRequestDialog}
                organization={{
                    name: data.org.name,
                    logo: data.org.logo,
                }}
                members={shareMembers}
                requestNumber={requestToShare?.reqNumber ?? ""}
                currentUserId={currentUserId}
                isLoadingMembers={shareMembersQuery.isLoading}
                onShare={shareRequest}
            />
        </>
    )
}

function createOptimisticMemberProfileFavorite({
    userId,
    organizationId,
    name,
    image,
    createdAt,
}: {
    userId: string
    organizationId: string
    name: string
    image?: string | null
    createdAt: string
}): FavoriteItem {
    return {
        id: `optimistic:member:${userId}`,
        entityType: "member",
        entityId: userId,
        organizationId,
        label: name,
        subtitle: "Member profile",
        createdAt,
        meta: {
            name,
            image: image ?? null,
        },
    }
}
