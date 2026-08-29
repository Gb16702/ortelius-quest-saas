import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { PresenceIndicator } from "@/entities/presence"
import { readJsonResponse } from "@/shared/api/http.response"
import { useSearchKeyboardShortcuts } from "@/shared/lib/hooks/use-search-keyboard-shortcuts"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/shared/ui/dialog"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { SearchInput } from "@/shared/ui/search-input"
import { MembersIcon } from "@/shared/ui/sidebar-icons"
import { Stack, StackItem } from "@/shared/ui/stack"
import { participantsResponseSchema } from "../model/schemas/chats.schema"

interface Participant {
    id: string
    name: string
    image?: string | null
    role?: string
}

interface ParticipantsDialogProps {
    isOpen: boolean
    onClose: () => void
    /** Fallback list shown instantly while we refetch from the server. */
    participants: Participant[]
    /** When provided, the dialog refetches from GET /api/conversations/:id/participants
     *  every time it opens so users see the live, server-side list — not a stale
     *  conversation-list cache that may be missing org members who joined late. */
    conversationId?: string
    onViewProfile?: (userId: string) => void
}

export function ParticipantsDialog({
    isOpen,
    onClose,
    participants,
    conversationId,
    onViewProfile,
}: ParticipantsDialogProps) {
    const { t } = useTranslation("chat")
    const [searchQuery, setSearchQuery] = useState("")
    const inputRef = useRef<HTMLInputElement>(null)
    const resultsRef = useRef<(HTMLDivElement | null)[]>([])
    const [liveParticipants, setLiveParticipants] = useState<Participant[] | null>(null)

    useEffect(() => {
        if (!isOpen || !conversationId) {
            setLiveParticipants(null)
            return
        }
        let cancelled = false
        ;(async () => {
            try {
                const res = await fetch(`/api/conversations/${conversationId}/participants`, {
                    credentials: "include",
                })
                const json = await readJsonResponse(res)
                const parsed = safeParseSchema(participantsResponseSchema, json)
                if (cancelled || !res.ok || !parsed.success) return
                const fresh = parsed.data.data.participants
                setLiveParticipants(
                    fresh.map((p) => ({ id: p.userId, name: p.name, image: p.image ?? null }))
                )
            } catch {
                // Fall back to the prop list — better to show something stale than nothing.
            }
        })()
        return () => {
            cancelled = true
        }
    }, [isOpen, conversationId])

    useSearchKeyboardShortcuts({
        searchInputRef: inputRef,
        hasSearchValue: !!searchQuery.trim(),
        onClear: () => setSearchQuery(""),
    })

    const effectiveParticipants = liveParticipants ?? participants
    const filteredParticipants = effectiveParticipants
        .filter((participant) => participant.name.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name))

    const clearSearchOnEscape = (e: KeyboardEvent) => {
        if (searchQuery.trim()) {
            e.preventDefault()
            setSearchQuery("")
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className="flex max-h-[80vh] flex-col p-0"
                onEscapeKeyDown={clearSearchOnEscape}
            >
                <DialogHeader className="border-b">
                    <DialogTitle>{t("participants.title")}</DialogTitle>
                    <DialogDescription>{t("participants.description")}</DialogDescription>
                </DialogHeader>
                {effectiveParticipants.length > 0 && (
                    <div className="bg-ds-canvas p-8 pb-2">
                        <SearchInput
                            autoFocus
                            ref={inputRef}
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder={t("participants.searchPlaceholder")}
                        />
                    </div>
                )}

                <div className="flex-1 overflow-y-auto bg-ds-canvas px-8 pb-8">
                    {filteredParticipants.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <MembersIcon />
                                </EmptyMedia>
                                <EmptyTitle>
                                    {searchQuery.trim()
                                        ? t("participants.noResults")
                                        : t("participants.empty")}
                                </EmptyTitle>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <Stack>
                            {filteredParticipants.map((participant, index) => (
                                <StackItem
                                    key={participant.id}
                                    ref={(el) => {
                                        resultsRef.current[index] = el
                                    }}
                                    className={`flex items-center gap-3 ${onViewProfile ? "cursor-pointer p-4 transition-colors hover:bg-ds-surface" : ""}`}
                                    onClick={() => onViewProfile?.(participant.id)}
                                >
                                    <div className="relative shrink-0">
                                        <GeneratedAvatar
                                            src={participant.image}
                                            fallbackText={participant.name}
                                            alt={`${participant.name} avatar`}
                                            size="md"
                                        />
                                        <PresenceIndicator
                                            userId={participant.id}
                                            size="md"
                                            className="absolute -right-0.5 -bottom-0.5"
                                            showOffline
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate font-medium text-ds-fg text-sm">
                                            {participant.name}
                                        </p>
                                    </div>
                                </StackItem>
                            ))}
                        </Stack>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
