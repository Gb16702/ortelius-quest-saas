import { Link } from "@tanstack/react-router"
import { Bell, Check, DoorOpen, Languages, Settings, User } from "lucide-react"
import { useTranslation } from "react-i18next"
import type { SessionResponse } from "@/entities/session"
import { clearQuestAssistantRealtimeLog, QuestAssistantEntry } from "@/features/quest-assistant"
import { clearClientLogoutStorage } from "@/shared/lib/auth/client-logout"
import { useAppLanguage } from "@/shared/lib/i18n/app-language.context"
import { preloadAppLanguageResources, type SupportedLanguage } from "@/shared/lib/i18n/marketing"
import { supportedLanguages, supportedLngs } from "@/shared/lib/i18n/marketing-languages"
import { setAppLanguageCookie } from "@/shared/lib/i18n/set-language-cookie"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSub,
    DropdownMenuSubContent,
    DropdownMenuSubTrigger,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"
import { HomeIcon } from "@/shared/ui/icons/home-icon"
import type { SidebarNotifications } from "../model/sidebar-notifications"
import { type SearchableItem, WorkspaceSearch } from "./workspace-search"

interface WorkspaceTopbarProps {
    sessionData: SessionResponse | null
    onMarketingHomeNavigate: () => void
    notificationBasePath: string
    notificationsOpen: boolean
    onNotificationsOpenChange: (open: boolean) => void
    notifications?: SidebarNotifications
    assistantOrganizationId?: string
    searchItems?: SearchableItem[]
    onSearchNavigate?: (url: string) => void
    onViewUserProfile?: (userId: string) => void
    onViewUserProfileIntent?: () => void
}

export function WorkspaceTopbar({
    sessionData,
    onMarketingHomeNavigate,
    notificationBasePath,
    notificationsOpen,
    onNotificationsOpenChange,
    notifications,
    assistantOrganizationId,
    searchItems,
    onSearchNavigate,
    onViewUserProfile,
    onViewUserProfileIntent,
}: WorkspaceTopbarProps) {
    const { t } = useTranslation("workspace")
    const { lang: currentLang, setLanguage } = useAppLanguage()
    const unreadCount = notifications?.unreadCount ?? 0
    const user = sessionData?.user
    const userName = user?.name ?? t("topbar.unknownUser")
    const userEmail = user?.email ?? ""
    const userId = user?.id ?? null

    const handleSelectLanguage = async (nextLang: SupportedLanguage) => {
        if (nextLang === currentLang) return

        setLanguage(nextLang)
        document.documentElement.lang = nextLang

        void setAppLanguageCookie({ data: { lang: nextLang } }).catch(() => undefined)
    }

    const handleLogoutClick = () => {
        clearClientLogoutStorage()
        void clearQuestAssistantRealtimeLog({ userId })
    }

    return (
        <header className="flex h-14 shrink-0 items-center justify-end gap-2 bg-ds-sidebar-canvas px-2">
            {searchItems && <WorkspaceSearch items={searchItems} onNavigate={onSearchNavigate} />}
            <QuestAssistantEntry organizationId={assistantOrganizationId} userId={userId} />
            {notifications?.renderPopover({
                open: notificationsOpen,
                onOpenChange: onNotificationsOpenChange,
                basePath: notificationBasePath,
                children: (
                    <button
                        type="button"
                        className="relative flex size-7 items-center justify-center rounded-full text-ds-fg transition-colors hover:bg-ds-surface-interactive hover:text-ds-fg"
                        aria-label={t("topbar.openNotifications")}
                    >
                        <Bell className="size-4 stroke-[2.1px]" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 flex h-1.5 w-1.5 items-center justify-center rounded-full bg-ds-accent-700" />
                        )}
                    </button>
                ),
            })}
            {user && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className="flex size-7 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-ring"
                            aria-label={t("topbar.openAccountMenu")}
                        >
                            <GeneratedAvatar
                                src={user.image}
                                fallbackText={userName}
                                alt={`${userName} avatar`}
                                size="sm"
                            />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        className="w-60"
                        side="bottom"
                        align="end"
                        sideOffset={10}
                        collisionPadding={8}
                    >
                        <div className="mb-1 flex items-center gap-3 px-2 py-2 text-sm">
                            <GeneratedAvatar
                                src={user.image}
                                fallbackText={userName}
                                alt={`${userName} avatar`}
                                size="sm"
                            />
                            <div className="min-w-0">
                                <div className="truncate font-medium text-ds-fg">{userName}</div>
                                <div className="mt-0.5 truncate text-ds-fg-muted text-sm">
                                    {userEmail}
                                </div>
                            </div>
                        </div>
                        <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={onMarketingHomeNavigate}
                        >
                            <HomeIcon className="mr-1 size-3.5 text-ds-fg" />
                            {t("topbar.homePage")}
                        </DropdownMenuItem>
                        {userId && onViewUserProfile && (
                            <DropdownMenuItem
                                onClick={() => onViewUserProfile(userId)}
                                onFocus={onViewUserProfileIntent}
                                onPointerDown={onViewUserProfileIntent}
                                onPointerEnter={onViewUserProfileIntent}
                                className="cursor-pointer"
                            >
                                <User className="mr-1 size-4 text-ds-fg" />
                                {t("topbar.viewProfile")}
                            </DropdownMenuItem>
                        )}
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <Link to="/me/account">
                                <Settings className="mr-1 size-4 text-ds-fg" />
                                {t("topbar.accountSettings")}
                            </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSub>
                            <DropdownMenuSubTrigger className="cursor-pointer">
                                <Languages className="mr-1 size-4 text-ds-fg" />
                                {t("userMenu.language")}
                            </DropdownMenuSubTrigger>
                            <DropdownMenuSubContent className="w-44">
                                {supportedLngs.map((code) => {
                                    const isActive = code === currentLang
                                    return (
                                        <DropdownMenuItem
                                            key={code}
                                            className="cursor-pointer"
                                            onFocus={() => preloadAppLanguageResources(code)}
                                            onPointerEnter={() => preloadAppLanguageResources(code)}
                                            onSelect={() => handleSelectLanguage(code)}
                                        >
                                            <span className="flex-1">
                                                {supportedLanguages[code].name}
                                            </span>
                                            {isActive && (
                                                <Check className="ml-auto size-4 text-ds-fg" />
                                            )}
                                        </DropdownMenuItem>
                                    )
                                })}
                            </DropdownMenuSubContent>
                        </DropdownMenuSub>
                        <DropdownMenuItem asChild className="cursor-pointer">
                            <a href="/auth/logout" onClick={handleLogoutClick}>
                                <DoorOpen className="mr-1 size-4 text-ds-fg" />
                                {t("topbar.signOut")}
                            </a>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </header>
    )
}
