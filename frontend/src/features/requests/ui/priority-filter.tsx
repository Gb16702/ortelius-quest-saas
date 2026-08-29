import { Check, ChevronDown, X } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/shared/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { priorityLabelKey } from "../lib/request-priority"

type PriorityValue = "high" | "medium" | "low"
const PRIORITY_VALUES: PriorityValue[] = ["high", "medium", "low"]

interface PriorityFilterProps {
    value: string[]
    onChange: (priorities: string[]) => void
    placeholder?: string
    className?: string
    size?: React.ComponentProps<typeof Button>["size"]
}

export function PriorityFilter({
    value,
    onChange,
    placeholder,
    className,
    size = "lg",
}: PriorityFilterProps) {
    const { t } = useTranslation("requests")
    const [open, setOpen] = useState(false)
    const resolvedPlaceholder = placeholder ?? t("filters.priorityPlaceholder")

    const togglePriority = (priority: string) => {
        const currentValue = value || []
        if (currentValue.includes(priority)) {
            onChange(currentValue.filter((p) => p !== priority))
        } else {
            onChange([...currentValue, priority])
        }
    }

    const clearSelection = () => {
        onChange([])
    }

    const getDisplayText = () => {
        if (!value || value.length === 0) return resolvedPlaceholder
        if (value.length === 1) {
            const priority = PRIORITY_VALUES.find((p) => p === value[0])
            return priority ? t(priorityLabelKey(priority)) : resolvedPlaceholder
        }
        return t("filters.selectedCount", { count: value.length })
    }

    const hasSelection = value && value.length > 0

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size={size}
                    radius="sm"
                    className={cn("w-[200px] justify-between gap-3 px-3", className)}
                >
                    <span className="truncate font-normal text-ds-fg text-sm">
                        {getDisplayText()}
                    </span>
                    {hasSelection ? (
                        // biome-ignore lint/a11y/noStaticElementInteractions: nested clear control inside a Popover trigger button — converting to <button> would create invalid button-in-button markup
                        // biome-ignore lint/a11y/useKeyWithClickEvents: non-keyboard handler intentional; nested control or interactive parent owns keyboard handling
                        <span
                            className="ml-2 flex size-4 shrink-0 cursor-pointer items-center justify-center"
                            onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                clearSelection()
                            }}
                        >
                            <X className="size-4 transition-colors hover:text-ds-fg" />
                        </span>
                    ) : (
                        <ChevronDown className="size-4 shrink-0" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandList>
                        <CommandEmpty>{t("filters.noPrioritiesFound")}</CommandEmpty>
                        <CommandGroup>
                            {PRIORITY_VALUES.map((priority) => {
                                const isSelected = value?.includes(priority) || false
                                const label = t(priorityLabelKey(priority))

                                return (
                                    <CommandItem
                                        key={priority}
                                        value={label}
                                        onSelect={() => togglePriority(priority)}
                                        className="gap-3"
                                    >
                                        {label}
                                        <div className="flex-1" />
                                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
