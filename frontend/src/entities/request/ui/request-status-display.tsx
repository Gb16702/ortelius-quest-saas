import { useTranslation } from "react-i18next"
import { StatusDot } from "@/shared/ui/status-dot"
import { getRequestStatusDisplay } from "../lib/request-status-display"

interface RequestStatusDisplayProps {
    status: string
    showLabel?: boolean
    className?: string
}

export function RequestStatusDisplay({
    status,
    showLabel = true,
    className,
}: RequestStatusDisplayProps) {
    const { t } = useTranslation("requests")
    const display = getRequestStatusDisplay(status)
    const label = t(display.labelKey, { defaultValue: display.fallbackLabel })

    return (
        <StatusDot
            colorClassName={display.colorClassName}
            label={label}
            showLabel={showLabel}
            className={className}
        />
    )
}
