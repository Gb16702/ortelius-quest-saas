import { Trans, useTranslation } from "react-i18next"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/shared/ui/alert-dialog"
import { Button } from "@/shared/ui/button"

type CancelRequestDialogVariant = "cancel" | "reject" | "discard"

interface CancelRequestDialogProps {
    requestNumber?: string
    isCancelLoading: boolean
    onConfirm: () => void
    variant?: CancelRequestDialogVariant
}

const variantConfig: Record<CancelRequestDialogVariant, { buttonVariant: "solid" | "ghost" }> = {
    cancel: { buttonVariant: "solid" },
    reject: { buttonVariant: "ghost" },
    discard: { buttonVariant: "ghost" },
}

export const CancelRequestDialog = ({
    requestNumber,
    isCancelLoading,
    onConfirm,
    variant = "cancel",
}: CancelRequestDialogProps) => {
    const { t } = useTranslation("requests")
    const config = variantConfig[variant]
    const verb = t(`cancelDialog.${variant}.verb`)

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button radius="full" size="xl" variant={config.buttonVariant}>
                    {t(`cancelDialog.${variant}.trigger`)}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{t(`cancelDialog.${variant}.title`)}</AlertDialogTitle>
                    <AlertDialogDescription>
                        <Trans
                            ns="requests"
                            i18nKey="cancelDialog.description"
                            values={{ verb, requestNumber: requestNumber ?? "" }}
                            components={{
                                strong: <span className="font-medium text-ds-fg text-sm" />,
                            }}
                        />
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>{t("action.close", { ns: "common" })}</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm} disabled={isCancelLoading}>
                        {isCancelLoading
                            ? t(`cancelDialog.${variant}.loading`)
                            : t(`cancelDialog.${variant}.action`)}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
