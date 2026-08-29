import { Link, useLocation } from "@tanstack/react-router"
import { ChartLine, DoorOpen, FileText, MessageSquare, Settings, Users } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import type { ActiveOrganization, SessionResponse } from "@/entities/session"
import { clearClientLogoutStorage } from "@/shared/lib/auth/client-logout"
import { Button } from "@/shared/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu"
import { GeneratedAvatar } from "@/shared/ui/generated-avatar"

interface HeaderProps {
    sessionData: SessionResponse | null
    activeOrganization?: ActiveOrganization | null
    renderNotificationMenu?: (basePath: string) => ReactNode
}

interface UserMenuPaths {
    requests: string
    chats: string
    account: string
    dashboard: string | null
    team: string | null
    notificationBase: string
}

function buildUserMenuPaths(activeOrganization?: ActiveOrganization | null): UserMenuPaths {
    const orgBase = activeOrganization?.slug ? `/org/${activeOrganization.slug}` : null
    return {
        requests: `${orgBase ?? "/me"}/requests`,
        chats: `${orgBase ?? "/me"}/chats`,
        account: "/me/account",
        dashboard: orgBase ? `${orgBase}/dashboard` : null,
        team: orgBase ? `${orgBase}/team` : null,
        notificationBase: orgBase ?? "/me",
    }
}

export const Header = ({
    sessionData,
    activeOrganization,
    renderNotificationMenu,
}: HeaderProps) => {
    const { t } = useTranslation("workspace")
    const user = sessionData?.user
    const pathname = useLocation({ select: (location) => location.pathname })

    const paths = buildUserMenuPaths(activeOrganization)

    const unknownUserLabel = t("header.unknownUser")
    const truncateName = (name: string, maxLength = 20): string => {
        if (!name) return unknownUserLabel

        const parts = name.trim().split(/\s+/).filter(Boolean)
        if (parts.length === 0) return unknownUserLabel
        const firstName = parts[0]
        const lastNameInitial = parts[parts.length - 1][0].toUpperCase()
        const formatted = `${lastNameInitial}. ${firstName}`

        if (formatted.length <= maxLength) return formatted

        const availableLength = maxLength - 3
        return `${lastNameInitial}. ${firstName.slice(0, availableLength)}...`
    }

    const displayName = user ? truncateName(user.name ?? unknownUserLabel) : ""

    const logoSrc = activeOrganization?.brandLogo
    const logoAlt = activeOrganization?.name
    const dashboardPath = paths.dashboard
    const teamPath = paths.team

    return (
        <div
            className={"flex h-[64px] w-full items-center justify-center bg-ds-canvas px-4 md:px-8"}
        >
            <header
                className={
                    "flex h-full w-full max-w-screen-3xl flex-row items-center justify-between gap-x-10"
                }
            >
                <div className={"flex items-center gap-x-8"}>
                    {logoSrc && logoAlt && (
                        <Link to="/" preload={false}>
                            <img width={120} src={logoSrc} alt={logoAlt} />
                        </Link>
                    )}
                </div>
                <div className={"flex items-center gap-x-3"}>
                    {user ? (
                        <>
                            {renderNotificationMenu?.(paths.notificationBase)}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <button
                                        type="button"
                                        className="!p-0 h-8 w-8 justify-start rounded-full !hover:bg-transparent outline-none"
                                    >
                                        <GeneratedAvatar
                                            src={user?.image}
                                            fallbackText={user.name}
                                            alt={`${displayName} avatar`}
                                            size="md"
                                        />
                                    </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent className="w-60" align="end" sideOffset={12}>
                                    <div className="px-2 py-1.5 text-sm">
                                        <div className="font-medium text-ds-fg">{user.name}</div>
                                        <div className="mt-0.5 text-sm">{user.email}</div>
                                    </div>
                                    {dashboardPath && pathname !== dashboardPath && (
                                        <DropdownMenuItem variant={"secondary"} asChild>
                                            <Link to={dashboardPath} className="flex items-center">
                                                <ChartLine className="mr-1 size-4 text-ds-fg" />
                                                {t("header.dashboard")}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {pathname !== paths.requests && (
                                        <DropdownMenuItem asChild>
                                            <Link to={paths.requests} className="flex items-center">
                                                <FileText className="mr-1 size-4 text-ds-fg" />
                                                {t("header.requests")}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {pathname !== paths.chats && (
                                        <DropdownMenuItem asChild>
                                            <Link to={paths.chats} className="flex items-center">
                                                <MessageSquare className="mr-1 size-4 text-ds-fg" />
                                                {t("header.chat")}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {teamPath && pathname !== teamPath && (
                                        <DropdownMenuItem asChild>
                                            <Link to={teamPath} className="flex items-center">
                                                <Users className="mr-1 size-4 text-ds-fg" />
                                                {t("header.members")}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    {pathname !== paths.account && (
                                        <DropdownMenuItem asChild>
                                            <Link to={paths.account} className="flex items-center">
                                                <Settings className="mr-1 size-4 text-ds-fg" />
                                                {t("header.accountSettings")}
                                            </Link>
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <a
                                            href="/auth/logout"
                                            onClick={() => clearClientLogoutStorage()}
                                            className="flex cursor-pointer items-center"
                                        >
                                            <DoorOpen className="mr-1 size-4 text-ds-fg" />
                                            {t("header.signOut")}
                                        </a>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    ) : (
                        <>
                            <Button
                                className={"hidden md:flex"}
                                radius="full"
                                variant={"outline"}
                                size={"sm"}
                                asChild
                            >
                                <Link to="/sign-in" preload={false}>
                                    {t("header.signIn")}
                                </Link>
                            </Button>
                            <Button variant={"solid"} radius="full" size={"sm"} asChild>
                                <Link to="/sign-in" preload={false}>
                                    {t("header.getStarted")}
                                </Link>
                            </Button>
                        </>
                    )}
                </div>
            </header>
        </div>
    )
}
