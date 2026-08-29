import { useCallback, useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { SessionResponse } from "@/entities/session"
import { type ChatAudioCallInput, ChatPageContent, ChatPageProvider } from "@/features/chat"
import { useMemberProfileDialog } from "@/features/members"
import {
    ChatSharedRequestCard,
    downloadRequestPdfWithToast,
    useRequestSheet,
} from "@/features/requests"
import { useVoIPCalls } from "@/features/voip"

interface MeChatConversationPageProps {
    conversationId: string
    sessionData: SessionResponse | null
    hrefBasePath?: string
    onNavigate?: (href: string) => void
}

export function MeChatConversationPage({
    conversationId,
    sessionData,
    hrefBasePath,
    onNavigate,
}: MeChatConversationPageProps) {
    const { t } = useTranslation("chat")
    const { openRequest, openRequestNumber } = useRequestSheet()
    const { openProfile } = useMemberProfileDialog()
    const voipCalls = useVoIPCalls()
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

    return (
        <ChatPageProvider
            basePath="/me"
            hrefBasePath={hrefBasePath}
            conversationId={conversationId}
            sessionData={sessionData}
            requestIntegration={requestIntegration}
            onViewMemberProfile={openProfile}
            onStartAudioCall={startAudioCall}
            onNavigate={onNavigate}
        >
            <ChatPageContent />
        </ChatPageProvider>
    )
}
