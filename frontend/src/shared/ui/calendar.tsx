import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import * as React from "react"
import { type DayButton, DayPicker, getDefaultClassNames } from "react-day-picker"
import { cn } from "@/shared/lib/class-names"
import { Button, buttonVariants } from "@/shared/ui/button"

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    captionLayout = "label",
    buttonVariant = "ghost",
    formatters,
    components,
    ...props
}: React.ComponentProps<typeof DayPicker> & {
    buttonVariant?: React.ComponentProps<typeof Button>["variant"]
}) {
    const defaultClassNames = getDefaultClassNames()

    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn(
                "group/calendar bg-ds-surface p-3 [--cell-size:--spacing(10)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent",
                String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
                String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
                className
            )}
            captionLayout={captionLayout}
            formatters={{
                formatMonthDropdown: (date) => date.toLocaleString("default", { month: "short" }),
                ...formatters,
            }}
            classNames={{
                root: cn("w-fit", defaultClassNames.root),
                months: cn("relative flex flex-col gap-10 md:flex-row", defaultClassNames.months),
                month: cn("flex w-full flex-col gap-4", defaultClassNames.month),
                nav: cn(
                    "absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1",
                    defaultClassNames.nav
                ),
                button_previous: cn(
                    buttonVariants({ variant: buttonVariant }),
                    "aria-disabled:pointer-events-auto aria-disabled:cursor-not-allowed",
                    "size-(--cell-size) p-0 aria-disabled:opacity-50",
                    "rounded-full hover:bg-ds-surface-interactive",
                    "disabled:!bg-transparent disabled:!border-none disabled:opacity-50",
                    defaultClassNames.button_previous
                ),
                button_next: cn(
                    buttonVariants({ variant: buttonVariant }),
                    "size-(--cell-size) select-none p-0 aria-disabled:opacity-50",
                    "rounded-full hover:bg-ds-surface-interactive",
                    "disabled:!bg-transparent disabled:!border-none disabled:opacity-50",
                    defaultClassNames.button_next
                ),
                month_caption: cn(
                    "flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)",
                    defaultClassNames.month_caption
                ),
                dropdowns: cn(
                    "flex h-(--cell-size) w-full items-center justify-center gap-1.5 font-medium text-sm",
                    defaultClassNames.dropdowns
                ),
                dropdown_root: cn(
                    "relative outline-none has-focus:border-ds-surface-border",
                    defaultClassNames.dropdown_root
                ),
                dropdown: cn(
                    "absolute inset-0 cursor-pointer bg-ds-surface opacity-0",
                    defaultClassNames.dropdown
                ),
                caption_label: cn(
                    "select-none font-medium",
                    captionLayout === "label"
                        ? "text-ds-fg text-sm"
                        : "flex h-8 items-center gap-2 rounded-full pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-ds-fg-muted",
                    defaultClassNames.caption_label
                ),
                month_grid: cn("w-full border-collapse", defaultClassNames.month_grid),
                weekdays: cn("flex", defaultClassNames.weekdays),
                weekday: cn(
                    "flex-1 select-none rounded-full font-normal text-[0.8rem] text-ds-fg-muted",
                    defaultClassNames.weekday
                ),
                week: cn("mt-2 flex w-full", defaultClassNames.week),
                week_number_header: cn(
                    "w-(--cell-size) select-none",
                    defaultClassNames.week_number_header
                ),
                week_number: cn(
                    "select-none text-[0.8rem] text-ds-fg-muted",
                    defaultClassNames.week_number
                ),
                day: cn(
                    "group/day relative aspect-square h-full w-full select-none p-0 text-center [&:first-child[data-selected=true]_button]:rounded-l-full [&:last-child[data-selected=true]_button]:rounded-r-full",
                    defaultClassNames.day
                ),
                range_start: cn(
                    "rounded-l-full bg-ds-surface-interactive",
                    defaultClassNames.range_start
                ),
                range_middle: cn("rounded-full", defaultClassNames.range_middle),
                range_end: cn(
                    "rounded-r-full bg-ds-surface-interactive",
                    defaultClassNames.range_end
                ),

                outside: cn(
                    "text-ds-fg-muted aria-selected:text-ds-fg-muted",
                    defaultClassNames.outside
                ),
                disabled: cn("!bg-transparent !border-none", defaultClassNames.disabled),
                hidden: cn("invisible", defaultClassNames.hidden),
                ...classNames,
            }}
            components={{
                Root: ({ className, rootRef, ...props }) => {
                    return (
                        <div
                            data-slot="calendar"
                            ref={rootRef}
                            className={cn(className)}
                            {...props}
                        />
                    )
                },
                Chevron: ({ className, orientation, ...props }) => {
                    if (orientation === "left") {
                        return <ChevronLeftIcon className={cn("size-4", className)} {...props} />
                    }

                    if (orientation === "right") {
                        return <ChevronRightIcon className={cn("size-4", className)} {...props} />
                    }

                    return <ChevronDownIcon className={cn("size-4", className)} {...props} />
                },
                DayButton: CalendarDayButton,
                WeekNumber: ({ children, ...props }) => {
                    return (
                        <td {...props}>
                            <div className="flex size-(--cell-size) items-center justify-center text-center">
                                {children}
                            </div>
                        </td>
                    )
                },
                ...components,
            }}
            {...props}
        />
    )
}

function CalendarDayButton({
    className,
    day,
    modifiers,
    ...props
}: React.ComponentProps<typeof DayButton>) {
    const defaultClassNames = getDefaultClassNames()

    const ref = React.useRef<HTMLButtonElement>(null)
    React.useEffect(() => {
        if (modifiers.focused) ref.current?.focus()
    }, [modifiers.focused])

    return (
        <Button
            ref={ref}
            variant="ghost"
            size="icon"
            data-day={day.date.toLocaleDateString()}
            data-selected-single={
                modifiers.selected &&
                !modifiers.range_start &&
                !modifiers.range_end &&
                !modifiers.range_middle
            }
            data-range-start={modifiers.range_start}
            data-range-end={modifiers.range_end}
            data-range-middle={modifiers.range_middle}
            disabled={modifiers.disabled}
            style={{ cursor: modifiers.disabled ? "not-allowed" : undefined }}
            className={cn(
                "rounded-full hover:rounded-full hover:bg-ds-surface-interactive hover:text-ds-fg",
                "disabled:!bg-transparent disabled:!border-none disabled:text-ds-control-fg-disabled",
                "flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 font-normal leading-none transition-none hover:text-ds-fg data-[range-end=true]:rounded-full data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-full data-[range-end=true]:bg-ds-accent data-[range-middle=true]:bg-ds-surface-interactive data-[range-start=true]:bg-ds-accent data-[selected-single=true]:bg-ds-accent data-[range-end=true]:text-ds-on-accent data-[range-middle=true]:text-ds-fg data-[range-start=true]:text-ds-on-accent data-[selected-single=true]:text-ds-on-accent group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-ds-accent [&>span]:text-xs [&>span]:opacity-70",
                defaultClassNames.day,
                className
            )}
            {...props}
        />
    )
}

export { Calendar, CalendarDayButton }
