import type { DateRange } from "react-day-picker"
import { useTranslation } from "react-i18next"
import { DateRangePicker } from "@/shared/ui/date-range-picker"
import { MultiSelect } from "@/shared/ui/multi-select"
import { AssignedToFilter } from "./assigned-to-filter"
import { PriorityFilter } from "./priority-filter"

interface RequestFiltersProps {
    dateRange: DateRange | undefined
    selectedStatuses: string[]
    statusOptions: { value: string; label: string; color: string }[]
    onStatusChange: (statuses: string[]) => void
    onDateRangeChange: (range: DateRange | undefined) => void
    selectedPriorities?: string[]
    onPriorityChange?: (priorities: string[]) => void
    organizationId?: string
    assignedTo?: string[]
    onAssignedToChange?: (memberIds: string[]) => void
    currentUserId?: string
    isOrganizationView?: boolean
}

export function RequestFilters({
    dateRange,
    selectedStatuses,
    statusOptions,
    onStatusChange,
    onDateRangeChange,
    selectedPriorities,
    onPriorityChange,
    organizationId,
    assignedTo,
    onAssignedToChange,
    currentUserId,
    isOrganizationView,
}: RequestFiltersProps) {
    const { t } = useTranslation("requests")
    return (
        <div className="flex flex-wrap items-center gap-2">
            <DateRangePicker
                value={dateRange}
                onChange={onDateRangeChange}
                placeholder={t("filters.datePlaceholder")}
                className="w-fit min-w-fit"
                size="sm"
            />
            {isOrganizationView && organizationId && onAssignedToChange && (
                <AssignedToFilter
                    organizationId={organizationId}
                    value={assignedTo || []}
                    onChange={onAssignedToChange}
                    currentUserId={currentUserId}
                    className="w-fit min-w-fit"
                    size="sm"
                />
            )}
            <MultiSelect
                options={statusOptions}
                value={selectedStatuses}
                onChange={onStatusChange}
                label={t("filters.statusLabel")}
                className="w-fit min-w-fit"
                size="sm"
            />
            {isOrganizationView && onPriorityChange && (
                <PriorityFilter
                    value={selectedPriorities || []}
                    onChange={onPriorityChange}
                    className="w-fit min-w-fit"
                    size="sm"
                />
            )}
        </div>
    )
}
