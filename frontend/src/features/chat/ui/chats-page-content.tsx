import { Link } from "@tanstack/react-router"
import { ChevronDown, Search } from "lucide-react"
import { useTranslation } from "react-i18next"
import { BreadcrumbNav } from "@/shared/ui/breadcrumb-nav"
import { Button } from "@/shared/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle } from "@/shared/ui/empty"
import { Input } from "@/shared/ui/input"
import { Kbd } from "@/shared/ui/kbd"
import { ProfilePageHead } from "@/shared/ui/profile-page-head"
import { ChatIcon } from "@/shared/ui/sidebar-icons"
import { Spinner } from "@/shared/ui/spinner"
import { useChatsActions, useChatsRefs, useChatsState } from "../model/chats-page.provider"
import { conversationSortValues, isConversationSort } from "../model/conversation-sort"
import { conversationTypeFilterValues, isConversationTypeFilter } from "../model/conversation-type"
import { ConversationListCard } from "./conversation-list-card"
import { ConversationsListSkeleton } from "./conversations-list-skeleton"

const conversationTypeFilters = conversationTypeFilterValues

export function ChatsPageContent() {
    const { t } = useTranslation("chat")
    const state = useChatsState()
    const actions = useChatsActions()
    const refs = useChatsRefs()
    const organizationSlug = state.basePath.startsWith("/org/")
        ? state.basePath.slice("/org/".length)
        : null

    if (!state.hasInitialLoad && state.conversations.length === 0) {
        if (state.isLoadingMore) {
            return (
                <div className="flex min-h-full w-full flex-col">
                    <BreadcrumbNav items={state.breadcrumbItems} />
                    <ProfilePageHead
                        title={t("page.title")}
                        subtitle={t("page.subtitle")}
                        maxWidth="4xl"
                    />
                    <div className="flex-1 px-4 sm:px-6">
                        <div className="mx-auto max-w-4xl py-6">
                            <ConversationsListSkeleton />
                        </div>
                    </div>
                </div>
            )
        }

        return (
            <div className="flex min-h-full w-full flex-col">
                <BreadcrumbNav items={state.breadcrumbItems} />
                <div className="flex flex-1 items-center justify-center p-8">
                    <div className="w-full max-w-md">
                        <Empty>
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <ChatIcon />
                                </EmptyMedia>
                                <EmptyTitle>{t("empty.noConversations")}</EmptyTitle>
                            </EmptyHeader>
                            <EmptyContent>
                                <Button variant="solid" size="sm" radius="full" asChild>
                                    {organizationSlug ? (
                                        <Link
                                            to="/org/$slug/requests"
                                            params={{ slug: organizationSlug }}
                                        >
                                            {t("empty.viewRequests")}
                                        </Link>
                                    ) : (
                                        <Link to="/" preload={false}>
                                            {t("empty.sendRequest")}
                                        </Link>
                                    )}
                                </Button>
                            </EmptyContent>
                        </Empty>
                    </div>
                </div>
            </div>
        )
    }

    const pinnedConversations = state.conversations.filter((c) => c.isPinned)
    const unpinnedConversations = state.conversations.filter((c) => !c.isPinned)

    const isUnreadFilter = state.filter === "unread"
    const emptyTitle = isUnreadFilter ? t("empty.noUnread") : t("empty.noResults")
    const showClearButton = isUnreadFilter ? Boolean(state.searchQuery) : state.hasActiveFilters
    const clearLabel = isUnreadFilter ? t("empty.clearSearch") : t("empty.clearFilters")

    const handleTypeFilterChange = (value: string) => {
        if (isConversationTypeFilter(value)) {
            actions.applyConversationTypeFilter(value)
        }
    }

    const handleStatusFilterChange = (value: string) => {
        if (value === "all" || value === "unread") {
            actions.applyConversationFilter(value)
        }
    }

    const handleSortChange = (value: string) => {
        if (isConversationSort(value)) {
            actions.applyConversationSort(value)
        }
    }

    return (
        <div className="flex min-h-full w-full flex-col">
            <BreadcrumbNav items={state.breadcrumbItems} />
            <ProfilePageHead title={t("page.title")} subtitle={t("page.subtitle")} maxWidth="4xl" />

            <div className="flex-1 px-4 sm:px-6">
                <div className="mx-auto max-w-4xl space-y-12 py-6">
                    <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
                        <div className="relative min-w-0 flex-1">
                            {state.showSpinner ? (
                                <Spinner className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-subtle" />
                            ) : (
                                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ds-fg-subtle" />
                            )}
                            <Input
                                size="sm"
                                ref={refs.searchInputRef}
                                type="text"
                                placeholder={t("search.placeholder")}
                                value={state.searchQuery}
                                onChange={(e) => actions.updateSearch(e.target.value)}
                                className="w-full pr-20 pl-10"
                            />
                            <div className="absolute top-1/2 right-3 -translate-y-1/2">
                                {state.searchQuery ? (
                                    <Kbd>Esc</Kbd>
                                ) : (
                                    <Kbd>{state.modifierKey} K</Kbd>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3 md:flex md:shrink-0 md:items-center">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        radius="md"
                                        className="justify-between"
                                    >
                                        {t("search.sort")}
                                        <ChevronDown className="size-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuRadioGroup
                                        value={state.conversationSort}
                                        onValueChange={handleSortChange}
                                    >
                                        {conversationSortValues.map((sortValue) => (
                                            <DropdownMenuRadioItem
                                                key={sortValue}
                                                value={sortValue}
                                                size="sm"
                                            >
                                                {t(`sort.${sortValue}`)}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        radius="md"
                                        className="justify-between"
                                    >
                                        {t("search.type")}
                                        <ChevronDown className="size-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-52">
                                    <DropdownMenuRadioGroup
                                        value={state.conversationTypeFilter}
                                        onValueChange={handleTypeFilterChange}
                                    >
                                        {conversationTypeFilters.map((typeFilter) => (
                                            <DropdownMenuRadioItem
                                                key={typeFilter}
                                                value={typeFilter}
                                                size="sm"
                                            >
                                                {typeFilter === "all"
                                                    ? t("search.allConversationTypes")
                                                    : t(`typeFilter.${typeFilter}`)}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        radius="md"
                                        className="justify-between"
                                    >
                                        {t("search.status")}
                                        <ChevronDown className="size-4 text-ds-fg-muted" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuRadioGroup
                                        value={state.filter}
                                        onValueChange={handleStatusFilterChange}
                                    >
                                        <DropdownMenuRadioItem value="all" size="sm">
                                            {t("search.allStatuses")}
                                        </DropdownMenuRadioItem>
                                        <DropdownMenuRadioItem value="unread" size="sm">
                                            {t("search.isUnread")}
                                        </DropdownMenuRadioItem>
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>

                    <section className="space-y-4">
                        <div className="space-y-4">
                            {pinnedConversations.length > 0 && (
                                <div className="space-y-4">
                                    <h3 className="mt-3 font-medium text-ds-fg-muted text-sm">
                                        {t("section.pinned")}
                                    </h3>
                                    {pinnedConversations.map((conversation) => (
                                        <ConversationListCard
                                            key={conversation.id}
                                            id={conversation.id}
                                            name={conversation.name}
                                            lastMessage={conversation.lastMessage}
                                            messageCount={conversation.messageCount}
                                            participants={conversation.participants}
                                            updatedAt={conversation.updatedAt}
                                            contextInfo={conversation.contextInfo}
                                            isTeamChat={conversation.isTeamChat}
                                            isPinned={conversation.isPinned}
                                            pinnedAt={conversation.pinnedAt}
                                            onPinToggle={(
                                                _conversationId,
                                                nextValue,
                                                currentValue
                                            ) =>
                                                actions.toggleConversationPin(
                                                    conversation,
                                                    nextValue,
                                                    currentValue
                                                )
                                            }
                                            basePath={state.basePath}
                                            hrefBasePath={state.hrefBasePath}
                                            currentUserId={state.currentUserId}
                                        />
                                    ))}
                                </div>
                            )}

                            {unpinnedConversations.length > 0 && (
                                <div className="space-y-4">
                                    {unpinnedConversations.length > 1 &&
                                        pinnedConversations.length > 0 && (
                                            <h3 className="mt-12 font-medium text-ds-fg-muted text-sm">
                                                {t("section.unpinned")}
                                            </h3>
                                        )}
                                    {unpinnedConversations.map((conversation) => (
                                        <ConversationListCard
                                            key={conversation.id}
                                            id={conversation.id}
                                            name={conversation.name}
                                            lastMessage={conversation.lastMessage}
                                            messageCount={conversation.messageCount}
                                            participants={conversation.participants}
                                            updatedAt={conversation.updatedAt}
                                            contextInfo={conversation.contextInfo}
                                            isTeamChat={conversation.isTeamChat}
                                            isPinned={conversation.isPinned}
                                            pinnedAt={conversation.pinnedAt}
                                            onPinToggle={(
                                                _conversationId,
                                                nextValue,
                                                currentValue
                                            ) =>
                                                actions.toggleConversationPin(
                                                    conversation,
                                                    nextValue,
                                                    currentValue
                                                )
                                            }
                                            basePath={state.basePath}
                                            hrefBasePath={state.hrefBasePath}
                                            currentUserId={state.currentUserId}
                                        />
                                    ))}
                                </div>
                            )}

                            {state.conversations.length === 0 && !state.isLoadingMore && (
                                <Empty>
                                    <EmptyHeader>
                                        <EmptyMedia variant="icon">
                                            <ChatIcon />
                                        </EmptyMedia>
                                        <EmptyTitle>{emptyTitle}</EmptyTitle>
                                    </EmptyHeader>
                                    {showClearButton && (
                                        <EmptyContent>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                radius="full"
                                                onClick={actions.clearAllFilters}
                                            >
                                                {clearLabel}
                                            </Button>
                                        </EmptyContent>
                                    )}
                                </Empty>
                            )}

                            {state.hasMore && (
                                <div ref={refs.observerTarget} className="flex justify-center py-4">
                                    {state.isLoadingMore && <Spinner className="size-6" />}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
