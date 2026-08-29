import { ChevronDownIcon } from "lucide-react"
import type React from "react"
import { useId, useImperativeHandle, useState } from "react"
import type { DateRange } from "react-day-picker"
import { enUS } from "react-day-picker/locale"
import { cn } from "@/shared/lib/class-names"
import { formatDateRangeSmart } from "@/shared/lib/date"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Button } from "@/shared/ui/button"
import { Calendar } from "@/shared/ui/calendar"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/shared/ui/field"
import { FormGroup } from "@/shared/ui/form-group"
import { Input } from "@/shared/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import { useSendRequestContact } from "../../../model/hooks/use-send-request-contact"
import type { StepRef } from "../../../model/request"
import { contactInfoSchema } from "../../../model/schemas/send-request.schema"
import { useSendRequestStore } from "../../../model/use-send-request.store"

const CALENDAR_FORMATTERS = {
    formatMonthDropdown: (date: Date) => date.toLocaleString("en-US", { month: "long" }),
    formatWeekdayName: (date: Date) =>
        date.toLocaleString("en-US", { weekday: "short" }).slice(0, 1),
}

interface FieldErrors {
    firstName?: string
    lastName?: string
    email?: string
    dateRange?: string
}

export function ContactInformationStep({ ref }: { ref?: React.Ref<StepRef> }) {
    const firstNameId = useId()
    const lastNameId = useId()
    const emailId = useId()
    const dateId = useId()
    const { data, updateData } = useSendRequestStore()
    const { firstName, lastName, email, setFirstName, setLastName, setEmail } =
        useSendRequestContact()
    const [open, setOpen] = useState(false)
    const [errors, setErrors] = useState<FieldErrors>({})

    useImperativeHandle(ref, () => ({
        validate: () => {
            const result = safeParseSchema(contactInfoSchema, {
                firstName,
                lastName,
                email,
                dateRange: {
                    from: data.dateRange?.from ?? "",
                    to: data.dateRange?.to ?? "",
                },
            })

            if (result.success) {
                setErrors({})
                return Promise.resolve(true)
            }

            const fieldErrors: FieldErrors = {}
            for (const issue of result.error.issues) {
                const path = issue.path.join(".")
                if (path === "firstName") fieldErrors.firstName = issue.message
                else if (path === "lastName") fieldErrors.lastName = issue.message
                else if (path === "email") fieldErrors.email = issue.message
                else if (path.startsWith("dateRange")) fieldErrors.dateRange = issue.message
            }
            setErrors(fieldErrors)
            return Promise.resolve(false)
        },
    }))

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const selectedRange: DateRange | undefined = data.dateRange
        ? {
              from: data.dateRange.from ? new Date(data.dateRange.from) : undefined,
              to: data.dateRange.to ? new Date(data.dateRange.to) : undefined,
          }
        : undefined

    const selectDateRange = (range: DateRange | undefined) => {
        const from = range?.from?.toISOString() ?? ""
        const to = range?.to?.toISOString() ?? ""

        updateData({
            dateRange: {
                from: from || undefined,
                to: to || undefined,
            },
        })

        if (range?.from && range?.to) {
            const previousRange = selectedRange
            const isCompletingRange =
                !previousRange?.to && range.from.getTime() !== range.to.getTime()
            const isModifyingRange = previousRange?.from && previousRange?.to

            if (isCompletingRange || isModifyingRange) {
                setOpen(false)
            }
        }
    }

    return (
        <div className="flex w-full flex-col gap-y-5">
            <div className="grid grid-cols-2 gap-4">
                <FormGroup data-invalid={!!errors.firstName}>
                    <FieldLabel htmlFor={firstNameId}>First name</FieldLabel>
                    <Input
                        id={firstNameId}
                        size="sm"
                        autoFocus={true}
                        placeholder="John"
                        aria-invalid={!!errors.firstName}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                    />
                    {errors.firstName && <FieldError>{errors.firstName}</FieldError>}
                </FormGroup>
                <FormGroup data-invalid={!!errors.lastName}>
                    <FieldLabel htmlFor={lastNameId}>Last name</FieldLabel>
                    <Input
                        id={lastNameId}
                        size="sm"
                        placeholder="Doe"
                        aria-invalid={!!errors.lastName}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                    />
                    {errors.lastName && <FieldError>{errors.lastName}</FieldError>}
                </FormGroup>
            </div>
            <FormGroup data-invalid={!!errors.email}>
                <FieldLabel htmlFor={emailId}>Email</FieldLabel>
                <Input
                    id={emailId}
                    size="sm"
                    type="email"
                    placeholder="you@company.com"
                    aria-invalid={!!errors.email}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                {errors.email ? (
                    <FieldError>{errors.email}</FieldError>
                ) : (
                    <FieldDescription>We'll send request updates to this address</FieldDescription>
                )}
            </FormGroup>
            <Popover open={open} onOpenChange={setOpen}>
                <Field data-invalid={!!errors.dateRange} className="items-start gap-y-2">
                    <FieldLabel htmlFor={dateId}>Date range</FieldLabel>
                    <PopoverTrigger asChild>
                        <Button
                            radius="sm"
                            variant="outline"
                            size="lg"
                            id={dateId}
                            aria-invalid={!!errors.dateRange}
                            className={cn(
                                "!px-3 w-full justify-between font-normal text-base focus-visible:border-ds-gray-600 focus-visible:ring-ds-gray-600/40 md:text-sm",
                                selectedRange?.from && selectedRange?.to
                                    ? "text-ds-fg"
                                    : "text-ds-fg-muted",
                                errors.dateRange && "border-ds-danger-border"
                            )}
                        >
                            {formatDateRangeSmart(selectedRange)}
                            <ChevronDownIcon />
                        </Button>
                    </PopoverTrigger>
                    {errors.dateRange ? (
                        <FieldError>{errors.dateRange}</FieldError>
                    ) : (
                        <FieldDescription>
                            Select the shipping window for your cargo
                        </FieldDescription>
                    )}
                </Field>
                <PopoverContent className="w-auto overflow-hidden p-0" align="start" side="top">
                    <Calendar
                        mode="range"
                        numberOfMonths={1}
                        captionLayout="label"
                        locale={enUS}
                        showOutsideDays={false}
                        weekStartsOn={1}
                        selected={selectedRange}
                        onSelect={selectDateRange}
                        formatters={CALENDAR_FORMATTERS}
                        disabled={(date) => date < today}
                        startMonth={new Date()}
                    />
                </PopoverContent>
            </Popover>
        </div>
    )
}
