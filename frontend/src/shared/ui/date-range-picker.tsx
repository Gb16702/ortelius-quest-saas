import { CalendarIcon, ChevronDown, X } from "lucide-react"
import * as React from "react"
import type { DateRange } from "react-day-picker"
import { cn } from "@/shared/lib/class-names"
import { formatDateRangeSmart } from "@/shared/lib/date"
import { Button } from "@/shared/ui/button"
import { Calendar } from "@/shared/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"

interface DateRangePickerProps {
    value?: DateRange
    onChange?: (dateRange: DateRange | undefined) => void
    placeholder?: string
    className?: string
    size?: React.ComponentProps<typeof Button>["size"]
    disabled?: boolean
}

const DateRangePicker = React.forwardRef<HTMLButtonElement, DateRangePickerProps>(
    (
        { value, onChange, placeholder = "Select Date Range", className, size = "lg", disabled },
        ref
    ) => {
        const [open, setOpen] = React.useState(false)
        const [mounted, setMounted] = React.useState(false)

        React.useEffect(() => {
            setMounted(true)
        }, [])

        const selectDateRange = (dateRange: DateRange | undefined) => {
            onChange?.(dateRange)
        }

        const clearDateRange = (e: React.MouseEvent) => {
            e.preventDefault()
            e.stopPropagation()
            onChange?.(undefined)
        }

        const formatDisplayValue = () => {
            if (!value || !value.from) {
                return placeholder
            }

            return formatDateRangeSmart(value)
        }

        return (
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        ref={ref}
                        radius="sm"
                        variant="outline"
                        size={size}
                        className={cn(
                            "w-[280px] justify-between gap-3 px-3 text-left font-normal",
                            className
                        )}
                        disabled={disabled}
                    >
                        <div className="flex items-center">
                            <CalendarIcon className="mr-2 size-4" />
                            {formatDisplayValue()}
                        </div>
                        {value?.from && mounted ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0"
                                onClick={clearDateRange}
                            >
                                <X className="size-4" />
                            </Button>
                        ) : (
                            <ChevronDown className="size-4 shrink-0" />
                        )}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                        mode="range"
                        selected={value}
                        onSelect={selectDateRange}
                        numberOfMonths={1}
                        weekStartsOn={1}
                        showOutsideDays={false}
                        formatters={{
                            formatWeekdayName: (date) =>
                                date.toLocaleDateString("en-US", { weekday: "narrow" }),
                        }}
                    />
                </PopoverContent>
            </Popover>
        )
    }
)

DateRangePicker.displayName = "DateRangePicker"

export type { DateRange }
export { DateRangePicker }
