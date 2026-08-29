import { Search } from "lucide-react"
import { useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { useActivityEventTypes } from "@/entities/activity"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import { Input } from "@/shared/ui/input"
import { Skeleton } from "@/shared/ui/skeleton"

interface EventTypeFilterProps {
    organizationId: string
    organizationSlug: string
    selectedTypes: string[] | null
    onSelectionChange: (types: string[] | null) => void
}

export function EventTypeFilter({
    organizationId,
    organizationSlug,
    selectedTypes,
    onSelectionChange,
}: EventTypeFilterProps) {
    const { t } = useTranslation("team")
    const [search, setSearch] = useState("")
    const { data: eventTypesRaw = [], isLoading } = useActivityEventTypes(
        organizationId,
        organizationSlug
    )

    const eventTypes = useMemo(
        () =>
            eventTypesRaw.map((et) => ({
                ...et,
                label: t(`activity.event.${et.type}.label`, { defaultValue: et.label }),
                description: t(`activity.event.${et.type}.description`, {
                    defaultValue: et.description,
                }),
            })),
        [eventTypesRaw, t]
    )

    const filteredTypes = useMemo(() => {
        if (!search) return eventTypes
        const lower = search.toLowerCase()
        return eventTypes.filter(
            (et) =>
                et.label.toLowerCase().includes(lower) ||
                et.description.toLowerCase().includes(lower)
        )
    }, [search, eventTypes])

    const allTypes = useMemo(() => eventTypes.map((et) => et.type), [eventTypes])
    const allSelected = selectedTypes === null
    const selectedSet = useMemo(
        () => (selectedTypes ? new Set(selectedTypes) : null),
        [selectedTypes]
    )

    const toggleType = (eventType: string) => {
        if (allSelected) {
            onSelectionChange(allTypes.filter((t) => t !== eventType))
            return
        }

        const next = selectedSet?.has(eventType)
            ? selectedTypes.filter((t) => t !== eventType)
            : [...selectedTypes, eventType]

        if (next.length === allTypes.length) {
            onSelectionChange(null)
        } else {
            onSelectionChange(next)
        }
    }

    const selectAll = () => onSelectionChange(null)

    const clearAll = () => onSelectionChange([])

    const selectedCount = allSelected ? eventTypes.length : selectedTypes.length

    return (
        <div className="flex min-h-0 flex-1 flex-col">
            {isLoading ? (
                <>
                    <div className="px-8 pt-1.5 pb-3">
                        <Skeleton className="h-9 w-full rounded-md" />
                    </div>

                    <div className="flex items-center gap-2 px-8 pb-3">
                        <Skeleton className="h-8 w-[76px] rounded-full" />
                        <Skeleton className="h-8 w-[68px] rounded-full" />
                        <Skeleton className="ml-auto h-3.5 w-28" />
                    </div>

                    <div className="h-full flex-1 overflow-hidden">
                        {Array.from({ length: 20 }).map((_, i) => (
                            <div
                                // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                                key={i}
                                className={`flex items-start gap-3 px-8 py-3 ${i > 0 ? "border-ds-surface-border border-t" : ""}`}
                            >
                                <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
                                <div className="flex-1 space-y-1.5">
                                    <Skeleton className="h-4 w-36" />
                                    <Skeleton className="h-3 w-52" />
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    <div className="px-8 pt-1.5 pb-3">
                        <div className="relative">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                            <Input
                                size="sm"
                                placeholder={t("activity.eventFilter.searchPlaceholder")}
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2 px-8 pb-3">
                        <Button variant="outline" size="sm" onClick={selectAll}>
                            {t("activity.eventFilter.selectAll")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={clearAll}>
                            {t("activity.eventFilter.clearAll")}
                        </Button>
                        <span className="ml-auto text-ds-fg-muted text-xs">
                            {t("activity.eventFilter.selectedCount", {
                                selected: selectedCount,
                                total: eventTypes.length,
                            })}
                        </span>
                    </div>

                    <div className="scroll-mask-y flex-1 overflow-y-auto pb-4">
                        {filteredTypes.map((et, index) => {
                            const isChecked = allSelected || selectedSet?.has(et.type)
                            return (
                                // biome-ignore lint/a11y/noLabelWithoutControl: <Checkbox> is a Radix component that renders an input internally
                                <label
                                    key={et.type}
                                    className={`flex cursor-pointer items-start gap-3 px-8 py-3 transition-colors hover:bg-ds-surface-hover ${index > 0 ? "border-ds-surface-border border-t" : ""}`}
                                >
                                    <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => toggleType(et.type)}
                                        className="mt-0.5"
                                    />
                                    <div className="min-w-0">
                                        <p className="font-medium text-ds-fg text-sm">{et.label}</p>
                                        <p className="text-ds-fg-muted text-xs">{et.description}</p>
                                    </div>
                                </label>
                            )
                        })}
                        {filteredTypes.length === 0 ? (
                            <p className="py-4 text-center text-ds-fg-muted text-sm">
                                {t("activity.eventFilter.noMatch")}
                            </p>
                        ) : null}
                    </div>
                </>
            )}
        </div>
    )
}

export function EventTypeFilterSkeleton() {
    return (
        <div className="flex min-h-0 flex-1 flex-col">
            <div className="px-8 pt-1.5 pb-3">
                <Skeleton className="h-9 w-full rounded-sm" />
            </div>
            <div className="flex items-center gap-2 px-8 pb-3">
                <Skeleton className="h-8 w-[76px] rounded-full" />
                <Skeleton className="h-8 w-[68px] rounded-full" />
                <Skeleton className="ml-auto h-3.5 w-28" />
            </div>
            <div className="h-full flex-1 overflow-hidden">
                {Array.from({ length: 20 }).map((_, i) => (
                    <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: position-based key for static or stable-order list
                        key={i}
                        className={`flex items-start gap-3 px-8 py-3 ${i > 0 ? "border-ds-surface-border border-t" : ""}`}
                    >
                        <Skeleton className="mt-0.5 size-4 shrink-0 rounded" />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton className="h-4 w-36" />
                            <Skeleton className="h-3 w-52" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
