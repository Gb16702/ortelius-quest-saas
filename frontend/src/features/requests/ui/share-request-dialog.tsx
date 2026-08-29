import type { ReactNode } from "react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { PresenceIndicator } from "@/entities/presence"
import { cn } from "@/shared/lib/class-names"
import { useSearchKeyboardShortcuts } from "@/shared/lib/hooks/use-search-keyboard-shortcuts"
import { Button } from "@/shared/ui/button"
import { Checkbox } from "@/shared/ui/checkbox"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { FieldError, FieldLegend, FieldSet } from "@/shared/ui/field"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { SearchInput } from "@/shared/ui/search-input"
import { Spinner } from "@/shared/ui/spinner"
import { Stack } from "@/shared/ui/stack"

export interface ShareRequestMember {
    id: string
    name: string
    email: string
    image?: string | null
}

export interface ShareRequestSource {
    id: string
    reqNumber: string
}

export type ShareRequestDestination = { type: "team-chat" } | { type: "member"; memberId: string }

const TEAM_CHAT_DESTINATION_ID = "team-chat"

interface ShareRequestOrganization {
    name: string
    logo?: string | null
}

interface ShareRequestDialogProps {
    isOpen: boolean
    onClose: () => void
    organization: ShareRequestOrganization
    members: ShareRequestMember[]
    requestNumber: string
    currentUserId: string
    isLoadingMembers?: boolean
    onShare: (destinations: ShareRequestDestination[]) => void
}

export function ShareRequestDialog({
    isOpen,
    onClose,
    organization,
    members,
    requestNumber,
    currentUserId,
    isLoadingMembers = false,
    onShare,
}: ShareRequestDialogProps) {
    const { t } = useTranslation("requests")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedDestinationIds, setSelectedDestinationIds] = useState<string[]>([])
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const destinationsRef = useRef<HTMLDivElement>(null)

    useSearchKeyboardShortcuts({
        searchInputRef: inputRef,
        hasSearchValue: Boolean(searchQuery.trim()),
        onClear: () => setSearchQuery(""),
    })

    useEffect(() => {
        if (isOpen) return
        setSearchQuery("")
        setSelectedDestinationIds([])
        setError(null)
    }, [isOpen])

    const filteredMembers = useMemo(
        () =>
            members
                .filter((member) => member.id !== currentUserId)
                .filter((member) => {
                    const query = searchQuery.trim().toLowerCase()
                    if (!query) return true
                    return (
                        member.name.toLowerCase().includes(query) ||
                        member.email.toLowerCase().includes(query)
                    )
                })
                .sort((a, b) => a.name.localeCompare(b.name)),
        [currentUserId, members, searchQuery]
    )

    const toggleDestination = (destinationId: string) => {
        setSelectedDestinationIds((currentIds) =>
            currentIds.includes(destinationId)
                ? currentIds.filter((id) => id !== destinationId)
                : [...currentIds, destinationId]
        )
        if (error) setError(null)
    }

    const shareRequest = () => {
        if (selectedDestinationIds.length === 0) {
            setError(
                t("share.validationRequired", {
                    defaultValue: "Select at least one recipient.",
                })
            )
            const firstCheckbox =
                destinationsRef.current?.querySelector<HTMLButtonElement>('[role="checkbox"]')
            firstCheckbox?.focus()
            return
        }

        setError(null)
        onShare(
            selectedDestinationIds.map((destinationId) =>
                destinationId === TEAM_CHAT_DESTINATION_ID
                    ? { type: "team-chat" }
                    : { type: "member", memberId: destinationId }
            )
        )
        onClose()
    }

    const onEscapeKeyDown = (event: KeyboardEvent) => {
        if (searchQuery.trim()) {
            event.preventDefault()
            setSearchQuery("")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[80vh] gap-0 p-0" onEscapeKeyDown={onEscapeKeyDown}>
                <DialogHeader className="border-b">
                    <DialogTitle>{t("share.title", { defaultValue: "Share request" })}</DialogTitle>
                    <DialogDescription>
                        {t("share.description", {
                            defaultValue: "Choose where to share request {{requestNumber}}.",
                            requestNumber,
                        })}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-ds-canvas p-8 pb-8">
                    <SearchInput
                        autoFocus
                        ref={inputRef}
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={t("share.searchPlaceholder", {
                            defaultValue: "Search recipients...",
                        })}
                    />

                    <div className="mt-3 overflow-y-auto">
                        <FieldSet className="gap-0">
                            <FieldLegend className="sr-only" variant="label">
                                {t("share.destinationLegend", {
                                    defaultValue: "Recipients",
                                })}
                            </FieldLegend>
                            <Stack ref={destinationsRef}>
                                <DestinationOption
                                    id={TEAM_CHAT_DESTINATION_ID}
                                    checked={selectedDestinationIds.includes(
                                        TEAM_CHAT_DESTINATION_ID
                                    )}
                                    onToggle={toggleDestination}
                                    label={organization.name}
                                    avatar={
                                        <OrganizationLogo
                                            logo={organization.logo}
                                            name={organization.name}
                                        />
                                    }
                                />

                                {isLoadingMembers ? (
                                    <div className="flex items-center justify-center p-8">
                                        <Spinner className="size-6" />
                                    </div>
                                ) : filteredMembers.length === 0 ? (
                                    <div className="px-3 py-6 text-center text-ds-fg-muted text-sm">
                                        {t("share.noMembersFound", {
                                            defaultValue: "No members found.",
                                        })}
                                    </div>
                                ) : (
                                    filteredMembers.map((member) => (
                                        <DestinationOption
                                            key={member.id}
                                            id={member.id}
                                            checked={selectedDestinationIds.includes(member.id)}
                                            onToggle={toggleDestination}
                                            label={member.name}
                                            avatar={
                                                <div className="relative shrink-0">
                                                    <GeneratedAvatar
                                                        src={member.image}
                                                        fallbackText={member.name}
                                                        alt={member.name}
                                                        size="sm"
                                                    />
                                                    <PresenceIndicator
                                                        userId={member.id}
                                                        size="md"
                                                        className="absolute -right-0.5 -bottom-0.5"
                                                        showOffline
                                                    />
                                                </div>
                                            }
                                        />
                                    ))
                                )}
                            </Stack>
                        </FieldSet>
                        {error && <FieldError>{error}</FieldError>}
                    </div>
                </div>

                <DialogFooter className="border-ds-surface-border border-t px-8 py-4">
                    <div className="flex w-full items-center justify-end gap-3">
                        <div className="flex items-center gap-2">
                            <Button size="lg" radius="full" variant="outline" onClick={onClose}>
                                {t("action.close", { ns: "common" })}
                            </Button>
                            <Button size="lg" radius="full" variant="solid" onClick={shareRequest}>
                                {t("share.share", { defaultValue: "Share" })}
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

interface DestinationOptionProps {
    id: string
    checked: boolean
    onToggle: (id: string) => void
    label: string
    avatar?: ReactNode
}

function DestinationOption({ id, checked, onToggle, label, avatar }: DestinationOptionProps) {
    return (
        // biome-ignore lint/a11y/noLabelWithoutControl: <Checkbox> renders a Radix input internally
        <label
            className={cn(
                "flex w-full cursor-pointer items-center gap-3 p-3 transition-colors",
                "hover:bg-ds-surface-hover"
            )}
        >
            <Checkbox checked={checked} onCheckedChange={() => onToggle(id)} className="shrink-0" />
            {avatar ?? <GeneratedAvatar fallbackText={label} alt={label} size="sm" />}
            <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ds-fg text-sm">{label}</p>
            </div>
        </label>
    )
}

interface OrganizationLogoProps {
    logo?: string | null
    name: string
}

function OrganizationLogo({ logo, name }: OrganizationLogoProps) {
    const fallbackText = name.trim() ? name.trim().charAt(0).toUpperCase() : "O"

    return (
        <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ds-surface-border bg-ds-surface font-semibold text-[10px] text-ds-fg">
            {logo ? (
                <img
                    src={logo}
                    alt={`${name} logo`}
                    className="absolute inset-0 size-full object-cover"
                />
            ) : (
                fallbackText
            )}
        </span>
    )
}
