import i18n from "i18next"
import { ChevronDown, Search } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { readJsonResponse } from "@/shared/api/http.response"
import { formatSearchDate } from "@/shared/lib/date"
import { formatSenderName } from "@/shared/lib/name"
import { parseSchema, safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog"
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { Input } from "@/shared/ui/input"
import { Kbd } from "@/shared/ui/kbd"
import { ChatIcon } from "@/shared/ui/sidebar-icons"
import { Spinner } from "@/shared/ui/spinner"
import type { MessageData } from "../model/chat"
import { useMessageSearch } from "../model/hooks/use-message-search"
import { useMinimumLoadingDelay } from "../model/hooks/use-minimum-loading-delay"
import {
    chatApiErrorResponseSchema,
    messageSearchResponseSchema,
    type Pagination,
} from "../model/schemas/chats.schema"

const MESSAGE_SEARCH_LIMIT = 50
const MESSAGE_SEARCH_SCAN_LIMIT = 2000

function isAbortError(error: unknown) {
    return (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "AbortError"
    )
}

type MessageResult = MessageData

type SearchPagination = Pagination

function getMessageSearchResultTitle(message: MessageResult) {
    if (message.messageType === "system") return i18n.t("chat:searchDialog.activityEvent")
    return formatSenderName(message.senderName)
}

function getMessageSearchAvatarFallback(message: MessageResult) {
    if (message.senderName) return message.senderName
    return message.messageType === "system"
        ? i18n.t("chat:searchDialog.activityEvent")
        : i18n.t("chat:searchDialog.fallbackUser")
}

function mergeSearchResults(
    currentResults: MessageResult[],
    nextResults: MessageResult[],
    mode: "replace" | "append"
) {
    if (mode === "replace") return nextResults

    const existingIds = new Set(currentResults.map((message) => message.id))
    return [...currentResults, ...nextResults.filter((message) => !existingIds.has(message.id))]
}

function getMessageSearchUrl(conversationId: string, query: string, offset: number) {
    return `/api/conversations/${conversationId}/messages/search?q=${encodeURIComponent(query)}&limit=${MESSAGE_SEARCH_LIMIT}&offset=${offset}&scanLimit=${MESSAGE_SEARCH_SCAN_LIMIT}`
}

function getMessageSearchErrorMessage(payload: unknown): string {
    const fallback = i18n.t("chat:searchDialog.loadError")
    const result = safeParseSchema(chatApiErrorResponseSchema, payload)
    if (!result.success) return fallback
    return result.data.message || fallback
}

function toSearchPagination(
    pagination: Partial<SearchPagination> | undefined,
    messagesCount: number,
    offset: number
): SearchPagination {
    return {
        total: Number(pagination?.total ?? messagesCount),
        limit: Number(pagination?.limit ?? MESSAGE_SEARCH_LIMIT),
        offset: Number(pagination?.offset ?? offset),
        hasMore: Boolean(pagination?.hasMore ?? false),
    }
}

async function requestMessageSearch(
    conversationId: string,
    query: string,
    offset: number,
    signal: AbortSignal
) {
    const res = await fetch(getMessageSearchUrl(conversationId, query, offset), {
        credentials: "include",
        signal,
    })
    const json = await readJsonResponse(res)

    if (!res.ok) {
        throw new Error(getMessageSearchErrorMessage(json))
    }

    const parsed = parseSchema(messageSearchResponseSchema, json)
    return {
        messages: parsed.data?.messages ?? [],
        pagination: parsed.data?.pagination,
    }
}

interface MessageSearchDialogProps {
    isOpen: boolean
    onClose: () => void
    conversationId: string
    onMessageClick: (message: MessageResult) => void | Promise<void>
}

export function MessageSearchDialog({
    isOpen,
    onClose,
    conversationId,
    onMessageClick,
}: MessageSearchDialogProps) {
    const { t } = useTranslation("chat")
    const { search, updateSearch, clearSearch } = useMessageSearch()
    const [results, setResults] = useState<MessageResult[]>([])
    const [pagination, setPagination] = useState<SearchPagination | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isLoadingMore, setIsLoadingMore] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState<number>(-1)
    const inputRef = useRef<HTMLInputElement>(null)
    const resultsRef = useRef<(HTMLButtonElement | null)[]>([])
    const searchRequestRef = useRef(0)
    const activeSearchControllerRef = useRef<AbortController | null>(null)
    const isMountedRef = useRef(false)

    const showSpinner = useMinimumLoadingDelay(isLoading, 400)
    const resetSearchResults = useCallback(() => {
        setResults([])
        setPagination(null)
    }, [])

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
            searchRequestRef.current += 1
            activeSearchControllerRef.current?.abort()
        }
    }, [])

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100)
        } else {
            searchRequestRef.current += 1
            activeSearchControllerRef.current?.abort()
            clearSearch()
            setResults([])
            setPagination(null)
            setSelectedIndex(-1)
            setIsLoading(false)
            setIsLoadingMore(false)
        }
    }, [isOpen, clearSearch])

    useEffect(() => {
        setSelectedIndex(-1)
    }, [])

    const fetchSearchResults = useCallback(
        async (offset: number, mode: "replace" | "append") => {
            const query = search?.trim()
            if (!query || !conversationId) return

            const requestId = searchRequestRef.current + 1
            searchRequestRef.current = requestId
            activeSearchControllerRef.current?.abort()
            const controller = new AbortController()
            activeSearchControllerRef.current = controller

            const setActiveLoading = mode === "append" ? setIsLoadingMore : setIsLoading
            const resetResultsOnError = mode === "replace" ? resetSearchResults : undefined
            setActiveLoading(true)

            try {
                const { messages, pagination: nextPagination } = await requestMessageSearch(
                    conversationId,
                    query,
                    offset,
                    controller.signal
                )
                if (!isMountedRef.current || searchRequestRef.current !== requestId) return

                setResults((prev) => mergeSearchResults(prev, messages, mode))
                setPagination(toSearchPagination(nextPagination, messages.length, offset))
            } catch (error) {
                if (isAbortError(error)) return
                if (!isMountedRef.current || searchRequestRef.current !== requestId) return
                console.error("Failed to search messages:", error)
                resetResultsOnError?.()
            } finally {
                if (activeSearchControllerRef.current === controller) {
                    activeSearchControllerRef.current = null
                }
                if (isMountedRef.current && searchRequestRef.current === requestId) {
                    setIsLoading(false)
                    setIsLoadingMore(false)
                }
            }
        },
        [conversationId, resetSearchResults, search]
    )

    useEffect(() => {
        if (!search?.trim()) {
            searchRequestRef.current += 1
            setResults([])
            setPagination(null)
            setIsLoading(false)
            setIsLoadingMore(false)
            return
        }

        setIsLoading(true)

        const timer = setTimeout(() => {
            void fetchSearchResults(0, "replace")
        }, 400)

        return () => {
            clearTimeout(timer)
            searchRequestRef.current += 1
            activeSearchControllerRef.current?.abort()
        }
    }, [search, fetchSearchResults])

    const loadMoreResults = () => {
        if (!pagination?.hasMore || isLoadingMore) return
        void fetchSearchResults(pagination.offset + pagination.limit, "append")
    }

    const selectResult = (message: MessageResult) => {
        onClose()
        void onMessageClick(message)
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Escape") {
            if (search?.trim()) {
                e.preventDefault()
                e.stopPropagation()
                clearSearch()
            }
        } else if (e.key === "ArrowDown") {
            e.preventDefault()
            setSelectedIndex((prev) => {
                const nextIndex = prev < results.length - 1 ? prev + 1 : prev
                setTimeout(() => {
                    resultsRef.current[nextIndex]?.scrollIntoView({
                        behavior: "smooth",
                        block: "nearest",
                    })
                }, 0)
                return nextIndex
            })
        } else if (e.key === "ArrowUp") {
            e.preventDefault()
            setSelectedIndex((prev) => {
                const nextIndex = prev > 0 ? prev - 1 : -1
                if (nextIndex >= 0) {
                    setTimeout(() => {
                        resultsRef.current[nextIndex]?.scrollIntoView({
                            behavior: "smooth",
                            block: "nearest",
                        })
                    }, 0)
                } else {
                    inputRef.current?.focus()
                }
                return nextIndex
            })
        } else if (e.key === "Enter") {
            if (selectedIndex >= 0 && selectedIndex < results.length) {
                e.preventDefault()
                selectResult(results[selectedIndex])
            }
        }
    }

    const clearSearchOnEscape = (e: KeyboardEvent) => {
        if (search?.trim()) {
            e.preventDefault()
            clearSearch()
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                aria-describedby={undefined}
                className="flex max-h-[80vh] max-w-xl flex-col"
                onEscapeKeyDown={clearSearchOnEscape}
            >
                <DialogHeader>
                    <DialogTitle className="sr-only">{t("searchDialog.title")}</DialogTitle>
                    <div className="relative">
                        {showSpinner ? (
                            <Spinner className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                        ) : (
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-muted" />
                        )}
                        <Input
                            ref={inputRef}
                            type="text"
                            placeholder={t("searchDialog.placeholder")}
                            value={search}
                            onChange={(e) => updateSearch(e.target.value)}
                            onKeyDown={onKeyDown}
                            className="w-full pr-16 pl-10"
                        />
                        {search?.trim() && (
                            <div className="absolute top-1/2 right-3 -translate-y-1/2">
                                <Kbd>Esc</Kbd>
                            </div>
                        )}
                    </div>
                </DialogHeader>

                <DialogBody className="scroll-mask-y overflow-y-auto bg-ds-canvas [--scroll-mask-visible-color:var(--color-ds-canvas)]">
                    {!search?.trim() ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <ChatIcon />
                                </EmptyMedia>
                                <EmptyTitle>{t("searchDialog.empty")}</EmptyTitle>
                            </EmptyHeader>
                        </Empty>
                    ) : showSpinner ? (
                        <div className="flex items-center justify-center py-12">
                            <Spinner className="size-6 text-ds-fg-muted" />
                        </div>
                    ) : results.length === 0 ? (
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <ChatIcon />
                                </EmptyMedia>
                                <EmptyTitle>{t("searchDialog.noResults")}</EmptyTitle>
                            </EmptyHeader>
                        </Empty>
                    ) : (
                        <div className="space-y-2">
                            {results.map((message, index) => (
                                <button
                                    type="button"
                                    key={message.id}
                                    ref={(el) => {
                                        resultsRef.current[index] = el
                                    }}
                                    onClick={() => selectResult(message)}
                                    className={`w-full rounded-sm border p-4 text-left transition-all focus:outline-none ${
                                        selectedIndex === index
                                            ? "border-ds-surface-border bg-ds-canvas"
                                            : "border-ds-surface-border bg-ds-surface hover:border-ds-surface-border hover:bg-ds-surface-hover"
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <GeneratedAvatar
                                            src={message.senderImage}
                                            fallbackText={getMessageSearchAvatarFallback(message)}
                                            alt={`${getMessageSearchAvatarFallback(message)} avatar`}
                                            size="sm"
                                            className="flex-shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <div className="mb-1 flex items-center justify-between gap-2">
                                                <span className="font-medium text-ds-fg text-sm">
                                                    {getMessageSearchResultTitle(message)}
                                                </span>
                                                <span className="font-normal text-ds-fg-muted text-xs">
                                                    {formatSearchDate(message.createdAt)}
                                                </span>
                                            </div>
                                            <p className="line-clamp-2 font-normal text-ds-fg-muted text-sm">
                                                {message.content}
                                            </p>
                                        </div>
                                    </div>
                                </button>
                            ))}
                            {pagination?.hasMore && (
                                <div className="relative py-3">
                                    <div className="absolute top-1/2 right-0 left-0 -translate-y-1/2 border-ds-surface-border border-b border-dashed" />
                                    <button
                                        type="button"
                                        onClick={loadMoreResults}
                                        disabled={isLoadingMore}
                                        className="relative z-10 mx-auto flex h-7 items-center gap-1.5 rounded-full border border-ds-surface-border bg-ds-canvas px-3 font-medium text-ds-fg-muted text-xs transition-colors hover:border-ds-surface-border hover:text-ds-fg focus-visible:border-ds-surface-border focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ds-gray-600/40 disabled:cursor-not-allowed disabled:opacity-70"
                                    >
                                        {isLoadingMore ? (
                                            <Spinner className="size-3.5" />
                                        ) : (
                                            <ChevronDown className="size-3.5" />
                                        )}
                                        {isLoadingMore
                                            ? t("searchDialog.loading")
                                            : t("searchDialog.more")}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    )
}
