import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import { getOrgBreadcrumbItems, useOrg } from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import { type ChatAudioCallInput, ChatPageContent, ChatPageProvider } from "@/features/chat"
import { useMemberProfileDialog } from "@/features/members"
import {
    ChatSharedRequestCard,
    downloadRequestPdfWithToast,
    useRequestSheet,
} from "@/features/requests"
import { useVoIPCalls } from "@/features/voip"
import type { BreadcrumbNavItem } from "@/shared/ui/breadcrumb-nav"

interface OrgChatConversationPageProps {
    conversationId: string
    sessionData: SessionResponse | null
    hrefBasePath?: string
    onNavigate: (href: string) => void
}

export function OrgChatConversationPage({
    conversationId,
    sessionData,
    hrefBasePath,
    onNavigate,
}: OrgChatConversationPageProps) {
    const { t } = useTranslation("chat")
    const { state, meta: orgMeta } = useOrg()
    const { openProfile } = useMemberProfileDialog()
    const { openRequest, openRequestNumber } = useRequestSheet()
    const voipCalls = useVoIPCalls()
    const basePath = `/org/${orgMeta.slug}`
    const breadcrumbItemsPrefix = useMemo<BreadcrumbNavItem[]>(
        () => getOrgBreadcrumbItems(state.org, []),
        [state.org]
    )
    const requestIntegration = useMemo(
        () => ({
            isRequestOpen: (requestNumber: string) => openRequestNumber === requestNumber,
            openRequest,
            downloadPdf: (requestId: string, requestNumber: string) =>
                downloadRequestPdfWithToast({ requestId, requestNumber }),
            renderSharedRequest: (props: Parameters<typeof ChatSharedRequestCard>[0]) => (
                <ChatSharedRequestCard {...props} />
            ),
        }),
        [openRequest, openRequestNumber]
    )
    const startAudioCall = useCallback(
        ({ conversationId, conversation, currentUser }: ChatAudioCallInput) => {
            const callerDisplayInfo = {
                displayName: currentUser.name || currentUser.email || t("message.you"),
                displayImage: currentUser.image,
            }

            if (conversation.contextInfo?.type === "organization") {
                voipCalls.initiateOrgCall(
                    conversationId,
                    {
                        name: conversation.contextInfo.name,
                        logo: conversation.contextInfo.logo ?? null,
                    },
                    callerDisplayInfo,
                    "audio"
                )
                return
            }

            if (conversation.contextInfo?.type === "user" && conversation.contextInfo.id) {
                voipCalls.initiateCall(
                    conversationId,
                    {
                        userId: conversation.contextInfo.id,
                        userName: conversation.contextInfo.name || t("searchDialog.fallbackUser"),
                        userImage: conversation.contextInfo.image ?? null,
                    },
                    callerDisplayInfo,
                    "audio"
                )
                return
            }

            const otherParticipant = conversation.participants?.find(
                (participant) => participant.id !== currentUser.id
            )
            if (!otherParticipant) return

            voipCalls.initiateCall(
                conversationId,
                {
                    userId: otherParticipant.id,
                    userName: otherParticipant.name || t("searchDialog.fallbackUser"),
                    userImage: otherParticipant.image ?? null,
                },
                callerDisplayInfo,
                "audio"
            )
        },
        [t, voipCalls]
    )
    const navigateToHref = useCallback(
        (href: string) => {
            onNavigate(href)
        },
        [onNavigate]
    )

    return (
        <ChatPageProvider
            basePath={basePath}
            hrefBasePath={hrefBasePath}
            conversationId={conversationId}
            sessionData={sessionData}
            breadcrumbItemsPrefix={breadcrumbItemsPrefix}
            requestIntegration={requestIntegration}
            onViewMemberProfile={openProfile}
            onStartAudioCall={startAudioCall}
            onNavigate={navigateToHref}
        >
            <ChatPageContent />
        </ChatPageProvider>
    )
}
