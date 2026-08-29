import { Search } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { FieldLegend, FieldSet } from "@/shared/ui/field"
import { Input } from "@/shared/ui/input"
import { SelectableCard } from "@/shared/ui/selectable-card"
import { Skeleton } from "@/shared/ui/skeleton"
import type { ServiceType } from "../model/service-type"

const SERVICE_GROUP_SKELETON_KEYS = [
    "service-group-skeleton-1",
    "service-group-skeleton-2",
    "service-group-skeleton-3",
]
const SERVICE_ITEM_SKELETON_KEYS = [
    "service-item-skeleton-1",
    "service-item-skeleton-2",
    "service-item-skeleton-3",
    "service-item-skeleton-4",
]

interface ServiceSelectionItem {
    id: string
    name: string
}

interface ServiceSelectionGroupsProps {
    servicesByType: Record<ServiceType, ServiceSelectionItem[]>
    selectedServiceIds: ReadonlySet<string>
    isLoading: boolean
    onServiceChange: (serviceId: string, checked: boolean) => void
    feedback?: React.ReactNode
    legend?: string
}

export function ServiceSelectionGroups({
    servicesByType,
    selectedServiceIds,
    isLoading,
    onServiceChange,
    feedback,
    legend = "Services",
}: ServiceSelectionGroupsProps) {
    const [search, setSearch] = useState("")

    const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value)
    }

    if (isLoading) {
        return (
            <div className="flex w-full flex-col gap-y-4">
                <Skeleton className="h-10 w-full rounded-sm" />
                {SERVICE_GROUP_SKELETON_KEYS.map((groupKey) => (
                    <div key={groupKey}>
                        <Skeleton className="mb-2 h-3 w-20 rounded-xs" />
                        <div className="grid grid-cols-2 gap-3">
                            {SERVICE_ITEM_SKELETON_KEYS.map((itemKey) => (
                                <div
                                    key={`${groupKey}-${itemKey}`}
                                    className="flex min-h-[55px] items-center gap-6 rounded-sm border border-ds-surface-border bg-ds-surface px-4 py-3"
                                >
                                    <Skeleton className="h-4 w-4 shrink-0 rounded-xs" />
                                    <Skeleton className="h-3 w-24 rounded-xs" />
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    const lowerSearch = search.toLowerCase()
    const filteredGroups = Object.entries(servicesByType)
        .map(([type, services]) => ({
            type,
            services: services.filter((service) =>
                service.name.toLowerCase().includes(lowerSearch)
            ),
        }))
        .filter((group) => group.services.length > 0)

    return (
        <FieldSet className="gap-y-4">
            <FieldLegend className="sr-only" variant="label">
                {legend}
            </FieldLegend>
            <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                <Input
                    type="text"
                    size="sm"
                    placeholder="Search services..."
                    value={search}
                    onChange={handleSearchChange}
                    className="w-full pl-10"
                />
            </div>
            {filteredGroups.map(({ type, services }) => (
                <div key={type}>
                    <p className="mb-2 font-medium text-ds-fg-muted text-xs uppercase tracking-wide">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                        {services.map((service) => (
                            <SelectableCard
                                key={service.id}
                                id={service.id}
                                name={service.name}
                                checked={selectedServiceIds.has(service.id)}
                                onChange={onServiceChange}
                            />
                        ))}
                    </div>
                </div>
            ))}
            {feedback}
            {filteredGroups.length === 0 && (
                <p className="py-4 text-center text-ds-fg-muted text-sm">No services found</p>
            )}
        </FieldSet>
    )
}
