import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import * as v from "valibot"
import { PresenceIndicator } from "@/entities/presence"
import { cn } from "@/shared/lib/class-names"
import { useSearchKeyboardShortcuts } from "@/shared/lib/hooks/use-search-keyboard-shortcuts"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Badge } from "@/shared/ui/badge"
import { Button } from "@/shared/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { FieldError, FieldLegend, FieldSet } from "@/shared/ui/field"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group"
import { SearchInput } from "@/shared/ui/search-input"
import { MembersIcon } from "@/shared/ui/sidebar-icons"
import { Spinner } from "@/shared/ui/spinner"
import { Stack } from "@/shared/ui/stack"

const VALIDATION_REQUIRED_KEY = "requests:assign.validationRequired"

const assignRequestSchema = v.object({
    memberId: v.pipe(v.string(), v.minLength(1, VALIDATION_REQUIRED_KEY)),
})

interface Member {
    id: string
    name: string
    email: string
    image?: string | null
    role: string
}

interface AssignedInfo {
    id: string
    name: string
    email: string
    role: string
    image?: string | null
}

interface AssignRequestDialogProps {
    isOpen: boolean
    onClose: () => void
    members: Member[]
    currentAssignee?: AssignedInfo | null
    currentUserId?: string
    requestNumber: string
    isLoading?: boolean
    isLoadingMembers?: boolean
    onAssign: (memberId: string) => Promise<void>
    onUnassign?: () => Promise<void>
}

export function AssignRequestDialog({
    isOpen,
    onClose,
    members,
    currentAssignee,
    currentUserId,
    isLoading = false,
    isLoadingMembers = false,
    onAssign,
    onUnassign,
}: AssignRequestDialogProps) {
    const { t } = useTranslation("requests")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedMemberId, setSelectedMemberId] = useState<string>(currentAssignee?.id || "")
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const radioGroupRef = useRef<HTMLDivElement>(null)

    useSearchKeyboardShortcuts({
        searchInputRef: inputRef,
        hasSearchValue: !!searchQuery.trim(),
        onClear: () => setSearchQuery(""),
    })

    const filteredMembers = searchQuery.trim()
        ? members
              .filter(
                  (member) =>
                      member.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      member.email.toLowerCase().includes(searchQuery.toLowerCase())
              )
              .sort((a, b) => {
                  if (a.id === currentUserId) return -1
                  if (b.id === currentUserId) return 1
                  return 0
              })
              .slice(0, 5)
        : members
              .slice()
              .sort((a, b) => {
                  if (a.id === currentUserId) return -1
                  if (b.id === currentUserId) return 1
                  return 0
              })
              .slice(0, 5)

    const isSelectingCurrentAssignee = selectedMemberId && selectedMemberId === currentAssignee?.id

    const assignMember = async () => {
        const parsed = safeParseSchema(assignRequestSchema, { memberId: selectedMemberId })
        if (!parsed.success) {
            const messageKey = parsed.error.issues[0]?.message ?? VALIDATION_REQUIRED_KEY
            setError(t(messageKey, { defaultValue: messageKey }))
            const firstRadio =
                radioGroupRef.current?.querySelector<HTMLButtonElement>('[role="radio"]')
            firstRadio?.focus()
            return
        }
        setError(null)
        await onAssign(parsed.data.memberId)
    }

    const onSelectMember = (id: string) => {
        setSelectedMemberId(id)
        if (error) setError(null)
    }

    const unassignMember = async () => {
        if (!onUnassign) return
        await onUnassign()
    }

    const isReassigning = currentAssignee !== null && currentAssignee !== undefined

    const onEscapeKeyDown = (e: KeyboardEvent) => {
        if (searchQuery.trim()) {
            e.preventDefault()
            setSearchQuery("")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-h-[80vh] gap-0 p-0" onEscapeKeyDown={onEscapeKeyDown}>
                <DialogHeader className="border-b">
                    <DialogTitle>
                        {isReassigning ? t("assign.titleReassign") : t("assign.titleAssign")}
                    </DialogTitle>
                    <DialogDescription>
                        {isReassigning
                            ? t("assign.descriptionReassign")
                            : t("assign.descriptionAssign")}
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-ds-canvas p-8 pb-8">
                    <SearchInput
                        ref={inputRef}
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={t("assign.searchPlaceholder")}
                    />

                    <div className="mt-3 overflow-y-auto">
                        {isLoadingMembers ? (
                            <div className="flex items-center justify-center rounded-sm border border-ds-surface-border bg-ds-surface p-8">
                                <Spinner className="size-6" />
                            </div>
                        ) : filteredMembers.length === 0 ? (
                            <Empty>
                                <EmptyHeader>
                                    <EmptyMedia variant="icon">
                                        <MembersIcon />
                                    </EmptyMedia>
                                    <EmptyTitle>
                                        {searchQuery.trim()
                                            ? t("assign.noMembersFound")
                                            : t("assign.noMembersAvailable")}
                                    </EmptyTitle>
                                </EmptyHeader>
                            </Empty>
                        ) : (
                            <FieldSet className="gap-0">
                                <FieldLegend className="sr-only" variant="label">
                                    {t("assign.assigneeLegend")}
                                </FieldLegend>
                                <RadioGroup
                                    ref={radioGroupRef}
                                    value={selectedMemberId}
                                    onValueChange={onSelectMember}
                                    className="gap-0"
                                >
                                    <Stack>
                                        {filteredMembers.map((member) => {
                                            const isCurrentUser = member.id === currentUserId

                                            return (
                                                // biome-ignore lint/a11y/noLabelWithoutControl: <RadioGroupItem> is a Radix component that renders an input internally
                                                <label
                                                    key={member.id}
                                                    className={cn(
                                                        "flex w-full cursor-pointer items-center gap-3 p-3 transition-colors",
                                                        "hover:bg-ds-surface-hover"
                                                    )}
                                                >
                                                    <RadioGroupItem
                                                        value={member.id}
                                                        className="shrink-0"
                                                    />
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
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <p className="truncate font-medium text-ds-fg text-sm">
                                                                {member.name}
                                                            </p>
                                                            {isCurrentUser && (
                                                                <Badge variant="accent" size="sm">
                                                                    {t("assign.youBadge")}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="truncate font-normal text-ds-fg-muted text-xs">
                                                            {member.email}
                                                        </p>
                                                    </div>
                                                </label>
                                            )
                                        })}
                                    </Stack>
                                </RadioGroup>
                            </FieldSet>
                        )}
                        {error && <FieldError>{error}</FieldError>}
                    </div>
                </div>

                <DialogFooter className="border-ds-surface-border border-t px-8 py-4">
                    <div className="flex w-full items-center justify-between gap-3">
                        <Button
                            size={"lg"}
                            radius="full"
                            variant="outline"
                            onClick={onClose}
                            disabled={isLoading}
                        >
                            {t("action.close", { ns: "common" })}
                        </Button>
                        {isSelectingCurrentAssignee ? (
                            <Button
                                size={"lg"}
                                radius="full"
                                variant="solid"
                                onClick={unassignMember}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner className="size-4" />
                                        {t("assign.unassigning")}
                                    </>
                                ) : (
                                    t("assign.unassign")
                                )}
                            </Button>
                        ) : (
                            <Button
                                size={"lg"}
                                variant={"solid"}
                                radius="full"
                                onClick={assignMember}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <Spinner className="size-4" />
                                        {t("assign.assigning")}
                                    </>
                                ) : isReassigning ? (
                                    t("assign.reassign")
                                ) : (
                                    t("assign.assign")
                                )}
                            </Button>
                        )}
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
