import { Plus } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface InviteMemberBreadcrumbActionProps {
    onInvite: () => void
}

export function InviteMemberBreadcrumbAction({ onInvite }: InviteMemberBreadcrumbActionProps) {
    const { t } = useTranslation("team")
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    radius="full"
                    aria-label={t("inviteBreadcrumb.ariaLabel")}
                    onClick={onInvite}
                    className="text-ds-fg-muted transition-[color,background-color,border-color,box-shadow,scale] hover:text-ds-fg active:scale-[0.96]"
                >
                    <Plus className="size-4" />
                </Button>
            </TooltipTrigger>
            <TooltipContent align="end" side="bottom" sideOffset={8}>
                {t("inviteBreadcrumb.tooltip")}
            </TooltipContent>
        </Tooltip>
    )
}
