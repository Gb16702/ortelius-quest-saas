import type { ReactNode } from "react"

import { cn } from "@/shared/lib/class-names"
import { Checkbox } from "@/shared/ui/checkbox"
import { Label } from "@/shared/ui/label"

interface SelectableCardProps {
    id: string
    name: string
    checked?: boolean
    onChange?: (id: string, checked: boolean) => void
    layout?: "stacked" | "inline"
    icon?: ReactNode
    interactive?: boolean
    size?: "default" | "sm"
}

export function SelectableCard({
    id,
    name,
    checked = false,
    onChange,
    layout = "inline",
    icon,
    interactive = true,
    size = "default",
}: SelectableCardProps) {
    const iconSize = size === "sm" ? "[&>svg]:!h-8 [&>svg]:!w-8" : "[&>svg]:!h-10 [&>svg]:!w-10"

    if (layout === "stacked") {
        const Component = interactive ? Label : "div"

        return (
            <Component
                className={cn(
                    "flex min-h-fit flex-col items-center rounded-sm border bg-ds-surface p-3 text-center transition-colors",
                    size === "sm" ? "gap-1" : "gap-4",
                    interactive && "cursor-pointer",
                    checked
                        ? "border-ds-accent-700 text-ds-accent-700"
                        : "border-ds-surface-border text-ds-fg-muted",
                    interactive && checked && "hover:border-ds-accent-800 hover:text-ds-accent-800",
                    interactive && !checked && "hover:border-ds-surface-border"
                )}
            >
                {interactive && (
                    <Checkbox
                        checked={checked}
                        onCheckedChange={(checkedState) => onChange?.(id, !!checkedState)}
                        className="self-end"
                    />
                )}
                <div className="flex flex-1 flex-col items-center gap-3">
                    {icon && (
                        <div
                            className={cn(
                                "flex items-center justify-center [&>svg]:transition-colors",
                                iconSize,
                                checked ? "[&>svg]:text-ds-accent-700" : "[&>svg]:text-ds-fg-muted"
                            )}
                        >
                            {icon}
                        </div>
                    )}
                    <p className="font-normal text-sm leading-tight transition-colors duration-250">
                        {name}
                    </p>
                </div>
            </Component>
        )
    }

    const Component = interactive ? Label : "div"

    return (
        <Component
            className={cn(
                "flex min-h-[55px] items-center rounded-sm border bg-ds-surface px-4 py-3 transition-colors duration-150",
                size === "sm" ? "gap-2" : "gap-6",
                interactive && "cursor-pointer",
                checked
                    ? "border-ds-accent-700 text-ds-accent-700"
                    : "border-ds-surface-border text-ds-fg-muted",
                interactive && checked && "hover:border-ds-accent-800 hover:text-ds-accent-800",
                interactive && !checked && "hover:border-ds-surface-border"
            )}
        >
            {interactive && (
                <Checkbox
                    checked={checked}
                    onCheckedChange={(checkedState) => onChange?.(id, !!checkedState)}
                />
            )}
            <div className="grid gap-1.5 font-normal">
                <p className="text-sm transition-colors duration-250">{name}</p>
            </div>
        </Component>
    )
}
