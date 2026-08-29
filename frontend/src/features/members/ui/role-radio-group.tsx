import { cn } from "@/shared/lib/class-names"
import { FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/shared/ui/field"
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group"
import { Stack, StackItem } from "@/shared/ui/stack"

interface RoleOption {
    value: string
    label: string
    description: string
}

interface RoleRadioGroupProps {
    value: string
    onValueChange: (value: string) => void
    options: RoleOption[]
    disabled?: boolean
    legend?: string
}

export const RoleRadioGroup = ({
    value,
    onValueChange,
    options,
    disabled = false,
    legend = "Role",
}: RoleRadioGroupProps) => {
    return (
        <FieldSet className="gap-3">
            <FieldLegend className="sr-only" variant="label">
                {legend}
            </FieldLegend>
            <RadioGroup value={value} onValueChange={onValueChange} disabled={disabled}>
                <Stack>
                    {options.map((option) => {
                        const isSelected = value === option.value

                        return (
                            <StackItem
                                key={option.value}
                                className={cn(
                                    "flex cursor-pointer items-start gap-3 transition-colors",
                                    disabled && "cursor-not-allowed opacity-50",
                                    isSelected && "bg-ds-accent-100"
                                )}
                                onClick={() => !disabled && onValueChange(option.value)}
                            >
                                <RadioGroupItem
                                    value={option.value}
                                    id={`role-${option.value}`}
                                    disabled={disabled}
                                    className="mt-0.5"
                                />
                                <div className="flex-1 space-y-1">
                                    <FieldLabel
                                        htmlFor={`role-${option.value}`}
                                        className={cn(
                                            "cursor-pointer font-medium text-ds-fg text-sm",
                                            disabled && "cursor-not-allowed"
                                        )}
                                    >
                                        {option.label}
                                    </FieldLabel>
                                    <FieldDescription className="leading-relaxed">
                                        {option.description}
                                    </FieldDescription>
                                </div>
                            </StackItem>
                        )
                    })}
                </Stack>
            </RadioGroup>
        </FieldSet>
    )
}
