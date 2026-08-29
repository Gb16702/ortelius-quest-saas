import { ChevronDown, X } from "lucide-react"
import { useMemo, useState } from "react"
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
import { type ActivityActorLookupMember, useActivityActorSearch } from "../api/activity-actor.query"

interface ActorFilterProps {
    organizationId: string
    value: string | null
    onChange: (actorId: string | null) => void
    currentUserId: string
    className?: string
}

export function ActorFilter({
    organizationId,
    value,
    onChange,
    currentUserId,
    className,
}: ActorFilterProps) {
    const { t } = useTranslation("team")
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState("")
    const debouncedSearch = useDebouncedValue(search, 300)

    const { data, isLoading } = useActivityActorSearch(
        organizationId,
        { page: 1, limit: 6, search: debouncedSearch, role: "" },
        { enabled: !!organizationId && open }
    )

    const members = useMemo(
        () =>
            (data?.members ?? []).map((m: ActivityActorLookupMember) => ({
                id: m.user.id,
                name: m.user.name,
                email: m.user.email,
                image: m.user.image,
            })),
        [data?.members]
    )

    const sortedMembers = useMemo(
        () =>
            [...members].sort((a, b) => {
                if (a.id === currentUserId) return -1
                if (b.id === currentUserId) return 1
                return 0
            }),
        [members, currentUserId]
    )

    const selectedMember = value ? members.find((m) => m.id === value) : null

    const displayText =
        selectedMember?.name ?? (value ? t("activity.actorSelected") : t("activity.actorAll"))
    const hasSelection = value !== null

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
                    size="sm"
                    radius="md"
                    className={cn("!px-3 w-[200px] justify-between", className)}
                >
                    <span className="truncate font-normal text-ds-fg text-sm">{displayText}</span>
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
                                onChange(null)
                            }}
                        >
                            <X className="size-4 transition-colors hover:text-ds-fg" />
                        </span>
                    ) : (
                        <ChevronDown className="ml-2 size-4 shrink-0" />
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] rounded-sm p-0" align="start">
                <Command className="rounded-sm" shouldFilter={false}>
                    <CommandInput
                        placeholder={t("activity.actorSearchPlaceholder")}
                        value={search}
                        onValueChange={setSearch}
                    />
                    <CommandList>
                        {!isLoading && members.length === 0 && (
                            <CommandEmpty>{t("activity.actorEmpty")}</CommandEmpty>
                        )}
                        <CommandGroup>
                            {sortedMembers.map((member) => {
                                const isSelected = value === member.id
                                const isCurrentUser = member.id === currentUserId

                                return (
                                    <CommandItem
                                        key={member.id}
                                        value={member.id}
                                        onSelect={() => {
                                            onChange(isSelected ? null : member.id)
                                            setOpen(false)
                                            setSearch("")
                                        }}
                                        className={cn("gap-3", isSelected && "bg-ds-canvas")}
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
                                                        {t("activity.actorYou")}
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="truncate font-normal text-ds-fg-muted text-xs">
                                                {member.email}
                                            </p>
                                        </div>
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
