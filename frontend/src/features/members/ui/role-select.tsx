import type { AssignableRole } from "@/entities/access"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select"

interface RoleOption {
    value: AssignableRole
    label: string
    description?: string
}

interface RoleSelectProps {
    value?: string
    onValueChange?: (value: AssignableRole) => void
    availableRoles: RoleOption[]
    disabled?: boolean
    placeholder?: string
    className?: string
    id?: string
}

export function RoleSelect({
    value,
    onValueChange,
    availableRoles,
    disabled = false,
    placeholder = "Role",
    className,
    id,
}: RoleSelectProps) {
    const selectedRole = availableRoles.find((role) => role.value === value)

    return (
        <Select value={value} onValueChange={onValueChange} disabled={disabled}>
            <SelectTrigger className={className} id={id}>
                <SelectValue placeholder={placeholder}>
                    {selectedRole ? selectedRole.label : placeholder}
                </SelectValue>
            </SelectTrigger>
            <SelectContent align="end">
                {availableRoles.map((role) => (
                    <SelectItem key={role.value} value={role.value} className="py-3">
                        <div className="flex w-full flex-col items-start gap-1">
                            <div className="font-medium text-ds-fg text-sm">{role.label}</div>
                            {role.description && (
                                <div className="text-ds-fg-muted text-xs leading-relaxed">
                                    {role.description}
                                </div>
                            )}
                        </div>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
