import { ListFilter } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/shared/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"

interface EventTypeFilterTriggerProps {
    selectedTypes: string[] | null
    onOpen: () => void
}

export function EventTypeFilterTrigger({ selectedTypes, onOpen }: EventTypeFilterTriggerProps) {
    const { t } = useTranslation("team")
    const hasActiveEventFilter = selectedTypes !== null

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon-sm"
                    radius="full"
                    aria-label={t("activity.filterTrigger.ariaLabel")}
                    onClick={onOpen}
                    className="relative text-ds-fg-muted transition-[color,background-color,border-color,box-shadow,scale] hover:text-ds-fg active:scale-[0.96]"
                >
                    <ListFilter className="size-4" />
                    {hasActiveEventFilter && (
                        <span
                            aria-hidden="true"
                            className="absolute top-0 right-0 size-1.5 rounded-full bg-ds-accent ring-1 ring-ds-surface"
                        />
                    )}
                </Button>
            </TooltipTrigger>
            <TooltipContent align="end" side="bottom" sideOffset={8}>
                {t("activity.filterTrigger.tooltip")}
            </TooltipContent>
        </Tooltip>
    )
}
