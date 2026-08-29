import { Check, ChevronDown } from "lucide-react"
import React from "react"
import { cn } from "@/shared/lib/class-names"
import { Button } from "@/shared/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"

export interface MultiSelectOption {
    value: string
    label: string
    color?: string
}

interface MultiSelectProps {
    options: MultiSelectOption[]

    value: string[]
    onChange: (value: string[]) => void
    placeholder?: string
    label: string
    className?: string
    size?: "default" | "sm" | "lg"
}

export function MultiSelect({
    options,
    value,
    onChange,
    label,
    className,
    size = "default",
}: MultiSelectProps) {
    const [open, setOpen] = React.useState(false)

    const toggleOption = (optionValue: string) => {
        const isSelected = value.includes(optionValue)
        if (isSelected) {
            onChange(value.filter((item) => item !== optionValue))
        } else {
            onChange([...value, optionValue])
        }
    }

    const hasColors = options.some((option) => option.color)

    const renderTrigger = () => {
        return (
            <div className="flex w-full items-center gap-3">
                {hasColors && (
                    <div className="relative flex items-center">
                        {options.map((option, index) => {
                            const isSelected = value.includes(option.value)
                            return (
                                <div
                                    key={option.value}
                                    className={cn(
                                        "h-2.5 w-2.5 rounded-full border border-ds-surface",
                                        isSelected
                                            ? option.color
                                            : "border border-ds-surface-border bg-ds-surface outline-1 outline-ds-surface"
                                    )}
                                    style={{
                                        zIndex: index + 1,
                                        marginLeft: index > 0 ? "-3.5px" : "0",
                                    }}
                                />
                            )
                        })}
                    </div>
                )}

                <span className="font-normal text-ds-fg text-sm">{label}</span>
                <ChevronDown className="ml-auto size-4" />
            </div>
        )
    }

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    radius="md"
                    variant="outline"
                    size={size}
                    className={cn("min-w-[180px] justify-between gap-3 px-3", className)}
                >
                    {renderTrigger()}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[220px]" align="start">
                {options.map((option) => {
                    const isSelected = value.includes(option.value)
                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onSelect={(e) => {
                                e.preventDefault()
                                toggleOption(option.value)
                            }}
                        >
                            <div className="flex w-full items-center justify-between text-ds-fg">
                                <div className="flex items-center gap-2">
                                    {option.color && (
                                        <div
                                            className={cn(
                                                "h-2.5 w-2.5 rounded-full border border-ds-surface",
                                                option.color
                                            )}
                                        />
                                    )}
                                    <span>{option.label}</span>
                                </div>
                                {isSelected && <Check className="h-4 w-4 text-ds-fg" />}
                            </div>
                        </DropdownMenuItem>
                    )
                })}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
