import type { ComponentProps } from "react"
import { ChatIcon, RequestsIcon, SettingsIcon } from "@/shared/ui/sidebar-icons"

type SvgIcon = (props: ComponentProps<"svg">) => React.JSX.Element

export interface MeMenuItem {
    title: string
    titleKey: string
    url: string
    icon: SvgIcon
}

const accountItem: MeMenuItem = {
    title: "Account",
    titleKey: "sidebar.account",
    url: "/me/account",
    icon: SettingsIcon,
}

const shipperOnlyItems: MeMenuItem[] = [
    {
        title: "Requests",
        titleKey: "sidebar.requests",
        url: "/me/requests",
        icon: RequestsIcon,
    },
    {
        title: "Chats",
        titleKey: "sidebar.chats",
        url: "/me/chats",
        icon: ChatIcon,
    },
]

export function getMeMenuItems(hasActiveOrg: boolean): MeMenuItem[] {
    if (hasActiveOrg) {
        return [accountItem]
    }
    return [...shipperOnlyItems, accountItem]
}

export function isMeUrlActive(itemUrl: string, pathname: string): boolean {
    return pathname === itemUrl || pathname.startsWith(`${itemUrl}/`)
}
