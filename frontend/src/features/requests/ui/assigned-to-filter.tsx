import { Check, ChevronDown, X } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/shared/lib/class-names"
import { useDebouncedValue } from "@/shared/lib/hooks/use-debounced-value"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/shared/ui/command"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover"
import {
    type RequestMemberLookupMember,
    useRequestMemberSearch,
} from "../api/request-member-lookup.query"

interface AssignedToFilterProps {
    organizationId: string
    value: string[]
    onChange: (memberIds: string[]) => void
    placeholder?: string
    className?: string
    size?: React.ComponentProps<typeof Button>["size"]
    currentUserId?: string
}

export function AssignedToFilter({
    organizationId,
    value,
    onChange,
    placeholder,
    className,
    size = "lg",
    currentUserId,
}: AssignedToFilterProps) {
    const { t } = useTranslation("requests")
    const resolvedPlaceholder = placeholder ?? t("filters.assigneePlaceholder")
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebouncedValue(search, 300)

    const { data, isLoading } = useRequestMemberSearch(
        organizationId,
        { page: 1, limit: 6, search: debouncedSearch, role: "" },
        { enabled: !!organizationId && open }
    )

    const members = (data?.members || []).map((m: RequestMemberLookupMember) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
    }))

    const sortedMembers = [...members].sort((a, b) => {
        if (a.id === currentUserId) return -1
        if (b.id === currentUserId) return 1
        return 0
    })

    const toggleMember = (memberId: string) => {
        const currentValue = value || []
        if (currentValue.includes(memberId)) {
            onChange(currentValue.filter((id) => id !== memberId))
        } else {
            onChange([...currentValue, memberId])
        }
    }

    const clearSelection = () => {
        onChange([])
    }

    const getDisplayText = () => {
        if (!value || value.length === 0) {
            return resolvedPlaceholder
        }
        if (value.length === 1) {
            const member = members.find((m) => m.id === value[0])
            return member?.name || t("filters.selectedCount", { count: 1 })
        }
        return t("filters.selectedCount", { count: value.length })
    }

    const hasSelection = value && value.length > 0

    return (
        <Popover
            open={open}
            onOpenChange={(v) => {
                setOpen(v)
                if (!v) setSearch("")
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    size={size}
                    radius="sm"
                    className={cn("w-[200px] justify-between gap-3 px-3", className)}
                >
                    <span className="truncate font-normal text-ds-fg text-sm">
                        {getDisplayText()}
                    </span>
                    {hasSelection ? (
                        // biome-ignore lint/a11y/noStaticElementInteractions: nested clear control inside a Popover trigger button — converting to <button> would create invalid button-in-button markup
                        // biome-ignore lint/a11y/useKeyWithClickEvents: non-keyboard handler intentional; nested control or interactive parent owns keyboard handling
                        <span
                            className="ml-2 flex size-4 shrink-0 cursor-pointer items-center justify-center"
                            onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                            }}
                            onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                clearSelection()
                            }}
                        >
                            <X className="size-4 transition-colors hover:text-ds-fg" />
                        </span>
                    ) : (
                        <ChevronDown className="size-4 shrink-0" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] rounded-sm p-0" align="start">
                <Command className="rounded-sm" shouldFilter={false}>
                    <CommandInput
                        placeholder={t("filters.searchMember")}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        {!isLoading && members.length === 0 && (
                            <CommandEmpty>{t("filters.noMembersFound")}</CommandEmpty>
                        )}
                        <CommandGroup>
                            {sortedMembers.map((member) => {
                                const isSelected = value?.includes(member.id) || false
                                const isCurrentUser = member.id === currentUserId

                                return (
                                    <CommandItem
                                        key={member.id}
                                        value={member.id}
                                        onSelect={() => toggleMember(member.id)}
                                        className="gap-3"
                                    >
                                        <GeneratedAvatar
                                            src={member.image}
                                            fallbackText={member.name}
                                            alt={member.name}
                                            size="sm"
                                            className="shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex gap-x-2">
                                                <p className="truncate font-medium text-ds-fg text-sm">
                                                    {member.name}
                                                </p>
                                                {isCurrentUser && (
                                                    <Badge variant="accent" size="xs">
                                                        {t("assign.youBadge")}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="truncate font-normal text-ds-fg-muted text-xs">
                                                {member.email}
                                            </p>
                                        </div>
                                        {isSelected && <Check className="size-4 shrink-0" />}
                                    </CommandItem>
                                )
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
