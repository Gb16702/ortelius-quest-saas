import { Search } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { getModifierKey, isModifierKeyPressed } from "@/shared/lib/keyboard"
import { Input } from "@/shared/ui/input"
import { Kbd } from "@/shared/ui/kbd"
import type { MultiSelectOption } from "@/shared/ui/multi-select"
import { MultiSelect } from "@/shared/ui/multi-select"

interface MemberFiltersProps {
    searchValue: string
    selectedRoles: string[]
    selectedStatuses: string[]
    activeTab: string
    roleOptions: MultiSelectOption[]
    statusOptions: MultiSelectOption[]
    onSearchChange: (value: string) => void
    onRoleChange: (value: string[]) => void
    onStatusChange: (value: string[]) => void
}

export const MemberFilters = ({
    searchValue,
    selectedRoles,
    selectedStatuses,
    activeTab,
    roleOptions,
    statusOptions,
    onSearchChange,
    onRoleChange,
    onStatusChange,
}: MemberFiltersProps) => {
    const { t } = useTranslation("team")
    const { t: tCommon } = useTranslation("common")
    const searchInputRef = useRef<HTMLInputElement>(null)
    const [modifierKey, setModifierKey] = useState<string>("⌘")

    const translatedRoleOptions = useMemo(
        () =>
            roleOptions.map((option) => ({
                ...option,
                label: tCommon(`role.${option.value}`, { defaultValue: option.label }),
            })),
        [roleOptions, tCommon]
    )

    useEffect(() => {
        setModifierKey(getModifierKey())
    }, [])

    useEffect(() => {
        const inputElement = searchInputRef.current
        if (!inputElement || !searchValue) return

        const clearSearchOnEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault()
                event.stopPropagation()
                onSearchChange("")
            }
        }

        inputElement.addEventListener("keydown", clearSearchOnEscape)
        return () => {
            inputElement.removeEventListener("keydown", clearSearchOnEscape)
        }
    }, [searchValue, onSearchChange])

    useEffect(() => {
        const onGlobalKeyDown = (event: KeyboardEvent) => {
            if (isModifierKeyPressed(event) && event.key.toLowerCase() === "k") {
                event.preventDefault()
                searchInputRef.current?.focus()
            }
        }

        document.addEventListener("keydown", onGlobalKeyDown)
        return () => {
            document.removeEventListener("keydown", onGlobalKeyDown)
        }
    }, [])

    return (
        <div className="flex w-full items-center justify-start">
            <div className="flex items-center gap-2">
                <div className="relative">
                    <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform text-ds-fg-muted" />
                    <Input
                        ref={searchInputRef}
                        size="sm"
                        placeholder={
                            activeTab === "members"
                                ? t("filters.searchMembersPlaceholder")
                                : t("filters.searchEmailPlaceholder")
                        }
                        value={searchValue}
                        onChange={(event) => onSearchChange(event.target.value)}
                        className="pr-14 pl-10"
                    />
                    <div className="absolute top-1/2 right-3 -translate-y-1/2 transform">
                        {searchValue ? <Kbd>Esc</Kbd> : <Kbd>{modifierKey} K</Kbd>}
                    </div>
                </div>

                {activeTab === "members" && (
                    <MultiSelect
                        options={translatedRoleOptions}
                        value={selectedRoles}
                        onChange={onRoleChange}
                        label={t("filters.rolesLabel")}
                        className="w-fit min-w-fit"
                        size="sm"
                    />
                )}

                {activeTab === "invitations" && (
                    <MultiSelect
                        options={statusOptions}
                        value={selectedStatuses}
                        onChange={onStatusChange}
                        label={t("filters.invitationsLabel")}
                        className="w-fit min-w-fit"
                        size="sm"
                    />
                )}
            </div>
        </div>
    )
}
