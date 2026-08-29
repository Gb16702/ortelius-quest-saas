import { Trans, useTranslation } from "react-i18next"
import type { OrganizationMember } from "@/entities/member"
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
import { Note } from "@/shared/ui/note"
import { Spinner } from "@/shared/ui/spinner"
import { useMemberSubscriptionCapacity } from "../api/member-subscription-capacity.query"

interface RemoveMemberDialogProps {
    isOpen: boolean
    member: OrganizationMember | null
    organizationId: string
    onClose: () => void
    onConfirm: () => void
    isSubmitting: boolean
}

export const RemoveMemberDialog = ({
    isOpen,
    member,
    organizationId,
    onClose,
    onConfirm,
    isSubmitting,
}: RemoveMemberDialogProps) => {
    const { t } = useTranslation("team")
    const { data: subscription } = useMemberSubscriptionCapacity(organizationId)
    const showSeatReleaseNote =
        !!subscription &&
        subscription.hasActiveSubscription &&
        subscription.status !== "trialing" &&
        subscription.pricePerSeat > 0

    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t("removeMemberDialog.title")}</AlertDialogTitle>
                    <AlertDialogDescription>
                        <Trans
                            i18nKey="removeMemberDialog.description"
                            t={t}
                            values={{ name: member?.user.name ?? "" }}
                            components={{
                                strong: <span className="font-medium text-ds-fg text-sm" />,
                            }}
                        />
                    </AlertDialogDescription>
                </AlertDialogHeader>

                {showSeatReleaseNote && subscription && (
                    <Note type="secondary" hasIcon={true} label={false} className="mt-4">
                        {t("removeMemberDialog.seatReleaseNote", {
                            price: subscription.pricePerSeat,
                        })}
                    </Note>
                )}

                <AlertDialogFooter>
                    <AlertDialogCancel onClick={onClose}>
                        {t("removeMemberDialog.close")}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-ds-danger-solid hover:bg-ds-danger-solid-hover"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Spinner className="mr-2" />
                                {t("removeMemberDialog.removing")}
                            </>
                        ) : (
                            t("removeMemberDialog.confirm")
                        )}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
