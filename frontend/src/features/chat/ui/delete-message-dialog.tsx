import { useTranslation } from "react-i18next"
import { formatTime } from "@/shared/lib/date"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/shared/ui/alert-dialog"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { useChatPage } from "../model/chat-page.provider"

export function DeleteMessageDialog() {
    const { t } = useTranslation("chat")
    const { state, actions } = useChatPage()
    const { deletingMessage } = state

    return (
        <AlertDialog
            open={!!deletingMessage}
            onOpenChange={(open) => !open && actions.clearDeletingMessage()}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
                    <AlertDialogDescription>{t("delete.description")}</AlertDialogDescription>
                </AlertDialogHeader>
                {deletingMessage && (
                    <div className="px-6 pb-6">
                        <div className="rounded-sm border border-ds-surface-border bg-ds-canvas p-3">
                            <div className="flex items-start gap-3">
                                <GeneratedAvatar
                                    src={deletingMessage.senderImage}
                                    alt={deletingMessage.senderName}
                                    fallbackText={deletingMessage.senderName}
                                    size="md"
                                />
                                <div className="min-w-0 flex-1">
                                    <div className="mb-1 flex items-baseline gap-2">
                                        <span className="font-semibold text-ds-fg text-sm">
                                            {deletingMessage.senderName}
                                        </span>
                                        <span className="text-ds-fg-subtle text-xs">
                                            {formatTime(new Date(deletingMessage.createdAt))}
                                        </span>
                                    </div>
                                    <p className="line-clamp-3 whitespace-pre-wrap break-words text-ds-fg-muted text-sm">
                                        {deletingMessage.content}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("delete.cancel")}</AlertDialogCancel>
                    <AlertDialogAction onClick={actions.confirmDeleteMessage}>
                        {t("delete.confirm")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
