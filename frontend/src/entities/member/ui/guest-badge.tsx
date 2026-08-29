import { useTranslation } from "react-i18next"
import { Badge } from "@/shared/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface GuestBadgeProps {
    className?: string
    showTooltip?: boolean
}

export function GuestBadge({ className, showTooltip = false }: GuestBadgeProps) {
    const { t } = useTranslation("common")
    const badge = (
        <Badge size={"sm"} variant="attention" className={className}>
            {t("guestBadge.label")}
        </Badge>
    )

    if (!showTooltip) {
        return badge
    }

    return (
        <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
                <span className="cursor-pointer">{badge}</span>
            </TooltipTrigger>
            <TooltipContent>
                <div className="leading-relaxed">
                    <p>{t("guestBadge.tooltip.account")}</p>
                    <p>{t("guestBadge.tooltip.notifications")}</p>
                </div>
            </TooltipContent>
        </Tooltip>
    )
}
