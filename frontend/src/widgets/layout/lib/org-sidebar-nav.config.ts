import type { ComponentProps } from "react"
import {
    ActivityIcon,
    ChatIcon,
    DashboardIcon,
    InvitationsIcon,
    MembersIcon,
    RequestsIcon,
    SettingsIcon,
    TeamIcon,
} from "@/shared/ui/sidebar-icons"

type SvgIcon = (props: ComponentProps<"svg">) => React.JSX.Element

export interface OrgSubMenuItem {
    title: string
    titleKey: string
    buildUrl: (slug: string) => string
    icon?: SvgIcon
    requiresAdmin: boolean
}

export interface OrgMenuItem {
    title: string
    titleKey: string
    buildUrl: (slug: string) => string
    icon: SvgIcon
    requiresAdmin?: boolean
    subItems?: OrgSubMenuItem[]
}

export const orgMainMenuItems: OrgMenuItem[] = [
    {
        title: "Dashboard",
        titleKey: "sidebar.dashboard",
        buildUrl: (slug) => `/org/${slug}/dashboard`,
        icon: DashboardIcon,
    },
    {
        title: "Requests",
        titleKey: "sidebar.requests",
        buildUrl: (slug) => `/org/${slug}/requests`,
        icon: RequestsIcon,
    },
    {
        title: "Chat",
        titleKey: "sidebar.chat",
        buildUrl: (slug) => `/org/${slug}/chats`,
        icon: ChatIcon,
    },
    {
        title: "Team",
        titleKey: "sidebar.team",
        buildUrl: (slug) => `/org/${slug}/team`,
        icon: TeamIcon,
        subItems: [
            {
                title: "Members",
                titleKey: "sidebar.members",
                buildUrl: (slug) => `/org/${slug}/team`,
                icon: MembersIcon,
                requiresAdmin: false,
            },
            {
                title: "Invitations",
                titleKey: "sidebar.invitations",
                buildUrl: (slug) => `/org/${slug}/team/invitations`,
                icon: InvitationsIcon,
                requiresAdmin: true,
            },
            {
                title: "Activity",
                titleKey: "sidebar.activity",
                buildUrl: (slug) => `/org/${slug}/team/activity`,
                icon: ActivityIcon,
                requiresAdmin: true,
            },
        ],
    },
    {
        title: "Settings",
        titleKey: "sidebar.settings",
        buildUrl: (slug) => `/org/${slug}/settings`,
        icon: SettingsIcon,
        requiresAdmin: true,
        subItems: [
            {
                title: "Branding",
                titleKey: "sidebar.branding",
                buildUrl: (slug) => `/org/${slug}/settings/branding`,
                requiresAdmin: true,
            },
            {
                title: "Business",
                titleKey: "sidebar.business",
                buildUrl: (slug) => `/org/${slug}/settings/business`,
                requiresAdmin: true,
            },
            {
                title: "Billing",
                titleKey: "sidebar.billing",
                buildUrl: (slug) => `/org/${slug}/settings/billing`,
                requiresAdmin: true,
            },
            {
                title: "Invoices",
                titleKey: "sidebar.invoices",
                buildUrl: (slug) => `/org/${slug}/settings/invoices`,
                requiresAdmin: true,
            },
            {
                title: "Legals",
                titleKey: "sidebar.legals",
                buildUrl: (slug) => `/org/${slug}/settings/legals`,
                requiresAdmin: true,
            },
        ],
    },
]

export function getFilteredOrgSubItems(item: OrgMenuItem, isAdmin: boolean) {
    if (!item.subItems) return []
    return item.subItems.filter((sub) => !sub.requiresAdmin || isAdmin)
}

export function isOrgUrlActive(itemUrl: string, pathname: string): boolean {
    return pathname === itemUrl
}

export function findActiveOrgCategory(pathname: string, slug: string): string | null {
    for (const item of orgMainMenuItems) {
        if (!item.subItems) continue
        if (pathname.startsWith(item.buildUrl(slug))) return item.title
        for (const sub of item.subItems) {
            if (pathname.startsWith(sub.buildUrl(slug))) return item.title
        }
    }
    return null
}
