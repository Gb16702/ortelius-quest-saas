import { Link } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import {
    isOrganizationFullySetUp,
    type OrganizationWorkspaceSummary,
    useOrg,
    useOrganizationSetup,
} from "@/entities/organization"
import type { SessionResponse } from "@/entities/session"
import { cn } from "@/shared/lib/class-names"
import {
    readSidebarSectionPreference,
    writeSidebarSectionPreference,
} from "@/shared/lib/sidebar-section-preference"
import { Button } from "@/shared/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible"
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/shared/ui/sidebar"
import { InviteMembersIcon, ShareCompanyPageIcon } from "@/shared/ui/sidebar-icons"
import {
    findActiveOrgCategory,
    getFilteredOrgSubItems,
    isOrgUrlActive,
    orgMainMenuItems,
} from "../lib/org-sidebar-nav.config"
import { useOrgSidebarNavigationIntent } from "../model/use-org-sidebar-navigation-intent"
import { OrgSidebarFavoritesSection } from "./org-sidebar-favorites-section"
import { OrgSidebarMembersSection } from "./org-sidebar-members-section"
import { OrgSidebarSetupChecklist } from "./org-sidebar-setup-checklist"

interface OrgSidebarProps {
    sessionData: SessionResponse | null
    onShareCompanyPage: () => void
    onShareCompanyPageIntent?: () => void
    onInviteMembers?: () => void
    onInviteMembersIntent?: () => void
    onViewUserProfile?: (userId: string) => void
    onViewUserProfileIntent?: () => void
    onRouteDataIntent?: (to: string) => void
}

function getOrgTrySectionPreferenceId(organizationId: string): string {
    return `org:${organizationId}:try`
}

const trySectionAnimationCurve = "cubic-bezier(0.2, 0, 0, 1)"

export function OrgSidebar({
    sessionData,
    onShareCompanyPage,
    onShareCompanyPageIntent,
    onInviteMembers,
    onInviteMembersIntent,
    onViewUserProfile,
    onViewUserProfileIntent,
    onRouteDataIntent,
}: OrgSidebarProps) {
    const { state, meta } = useOrg()
    const { t } = useTranslation("workspace")
    const slug = meta.slug
    const isAdmin = state.isAdmin
    const { location, visiblePathname, recordSidebarNavigationIntent } =
        useOrgSidebarNavigationIntent({ onRouteDataIntent })
    const { data: setupStatus } = useOrganizationSetup(isAdmin ? state.org.id : null)

    const filteredItems = orgMainMenuItems.filter((item) => !item.requiresAdmin || isAdmin)
    const trySectionPreferenceId = getOrgTrySectionPreferenceId(state.org.id)

    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(() =>
        findActiveOrgCategory(location.pathname, slug)
    )
    const [isTrySectionOpen, setIsTrySectionOpen] = useState(() =>
        readSidebarSectionPreference(trySectionPreferenceId)
    )

    const currentCategory = findActiveOrgCategory(visiblePathname, slug)
    const currentUserId = sessionData?.user?.id ?? ""

    useEffect(() => {
        setActiveSubmenu(currentCategory)
    }, [currentCategory])

    useEffect(() => {
        setIsTrySectionOpen(readSidebarSectionPreference(trySectionPreferenceId))
    }, [trySectionPreferenceId])

    const handleTrySectionOpenChange = useCallback(
        (open: boolean) => {
            setIsTrySectionOpen(open)
            writeSidebarSectionPreference(trySectionPreferenceId, open)
        },
        [trySectionPreferenceId]
    )

    const activeItem = activeSubmenu
        ? filteredItems.find((item) => item.title === activeSubmenu)
        : null
    const activeSubItems = activeItem ? getFilteredOrgSubItems(activeItem, isAdmin) : []
    const showSubmenu = activeSubmenu !== null && activeItem !== null
    const activeSubmenuLabel = activeItem ? t(activeItem.titleKey) : activeSubmenu
    const showSetupChecklist =
        setupStatus !== undefined &&
        !(isOrganizationFullySetUp(setupStatus) && setupStatus.memberCount > 1)

    return (
        <Sidebar collapsible="offcanvas" variant="inset" className="bg-ds-sidebar-surface">
            <SidebarContent className="!overflow-hidden gap-0">
                <OrgSidebarOrganizationLink
                    organization={state.org}
                    dashboardUrl={`/org/${slug}/dashboard`}
                    onIntent={(href, intent) =>
                        recordSidebarNavigationIntent(href, intent, "Organization")
                    }
                />
                <div className="relative flex-1 overflow-hidden">
                    <div
                        className={`flex h-full flex-col overflow-y-auto transition-[transform,opacity] duration-200 ${
                            showSubmenu
                                ? "pointer-events-none -translate-x-2 opacity-0"
                                : "translate-x-0 opacity-100"
                        }`}
                    >
                        <SidebarGroup className="px-2">
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    {filteredItems.map((item) => {
                                        const Icon = item.icon
                                        const subItems = getFilteredOrgSubItems(item, isAdmin)
                                        const hasSubMenu = subItems.length > 0
                                        const itemUrl = item.buildUrl(slug)
                                        const firstSubItemUrl = subItems[0]?.buildUrl(slug)
                                        const isActive = visiblePathname.startsWith(itemUrl)

                                        return (
                                            <SidebarMenuItem key={item.title}>
                                                {hasSubMenu ? (
                                                    <SidebarMenuButton
                                                        asChild
                                                        isActive={isActive}
                                                        className="group/nav"
                                                    >
                                                        <Link
                                                            to={firstSubItemUrl ?? itemUrl}
                                                            onClick={() => {
                                                                const href =
                                                                    firstSubItemUrl ?? itemUrl
                                                                setActiveSubmenu(item.title)
                                                                recordSidebarNavigationIntent(
                                                                    href,
                                                                    "click",
                                                                    item.title
                                                                )
                                                            }}
                                                            onFocus={() =>
                                                                recordSidebarNavigationIntent(
                                                                    firstSubItemUrl ?? itemUrl,
                                                                    "focus",
                                                                    item.title
                                                                )
                                                            }
                                                            onPointerEnter={() =>
                                                                recordSidebarNavigationIntent(
                                                                    firstSubItemUrl ?? itemUrl,
                                                                    "hover",
                                                                    item.title
                                                                )
                                                            }
                                                        >
                                                            <Icon />
                                                            <span>{t(item.titleKey)}</span>
                                                            <span className="ml-auto grid size-6 place-content-center rounded-sm transition-colors group-hover/nav:bg-ds-sidebar-surface-active">
                                                                <ChevronRight className="!size-4" />
                                                            </span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                ) : (
                                                    <SidebarMenuButton asChild isActive={isActive}>
                                                        <Link
                                                            to={itemUrl}
                                                            onClick={() => {
                                                                recordSidebarNavigationIntent(
                                                                    itemUrl,
                                                                    "click",
                                                                    item.title
                                                                )
                                                            }}
                                                            onFocus={() =>
                                                                recordSidebarNavigationIntent(
                                                                    itemUrl,
                                                                    "focus",
                                                                    item.title
                                                                )
                                                            }
                                                            onPointerEnter={() =>
                                                                recordSidebarNavigationIntent(
                                                                    itemUrl,
                                                                    "hover",
                                                                    item.title
                                                                )
                                                            }
                                                        >
                                                            <Icon />
                                                            <span>{t(item.titleKey)}</span>
                                                        </Link>
                                                    </SidebarMenuButton>
                                                )}
                                            </SidebarMenuItem>
                                        )
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>

                        <OrgSidebarFavoritesSection
                            organizationId={state.org.id}
                            organizationName={state.org.name}
                            currentUserId={currentUserId}
                            slug={slug}
                            onNavigationIntent={recordSidebarNavigationIntent}
                        />

                        {currentUserId && (
                            <OrgSidebarMembersSection
                                organizationId={state.org.id}
                                currentUserId={currentUserId}
                                slug={slug}
                                onOpenProfile={(userId) => onViewUserProfile?.(userId)}
                                onOpenProfileIntent={onViewUserProfileIntent}
                                onNavigationIntent={recordSidebarNavigationIntent}
                            />
                        )}

                        <Collapsible
                            open={isTrySectionOpen}
                            onOpenChange={handleTrySectionOpenChange}
                        >
                            <SidebarGroup className="px-2">
                                <SidebarGroupLabel
                                    asChild
                                    className="group/nav cursor-pointer transition-colors hover:bg-ds-sidebar-surface-hover hover:text-ds-sidebar-text"
                                >
                                    <CollapsibleTrigger>
                                        <span>{t("sidebar.try")}</span>
                                        <span className="ml-auto grid size-6 place-content-center rounded-sm text-ds-sidebar-text-muted transition-colors group-hover/nav:bg-ds-sidebar-surface-active group-hover/nav:text-ds-sidebar-text">
                                            <ChevronRight
                                                className={cn(
                                                    "!size-4 transition-transform duration-[140ms]",
                                                    isTrySectionOpen && "rotate-90"
                                                )}
                                                style={{
                                                    transitionTimingFunction:
                                                        trySectionAnimationCurve,
                                                }}
                                            />
                                        </span>
                                    </CollapsibleTrigger>
                                </SidebarGroupLabel>
                                <CollapsibleContent
                                    className="data-[state=closed]:[animation-duration:110ms] data-[state=open]:[animation-duration:140ms]"
                                    style={{ animationTimingFunction: trySectionAnimationCurve }}
                                >
                                    <SidebarGroupContent>
                                        <SidebarMenu>
                                            <SidebarMenuItem>
                                                <SidebarMenuButton
                                                    onClick={onShareCompanyPage}
                                                    onFocus={onShareCompanyPageIntent}
                                                    onPointerDown={onShareCompanyPageIntent}
                                                    onPointerEnter={onShareCompanyPageIntent}
                                                >
                                                    <ShareCompanyPageIcon />
                                                    <span>{t("sidebar.shareCompanyPage")}</span>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                            {isAdmin && onInviteMembers && (
                                                <SidebarMenuItem>
                                                    <SidebarMenuButton
                                                        onClick={onInviteMembers}
                                                        onFocus={onInviteMembersIntent}
                                                        onPointerDown={onInviteMembersIntent}
                                                        onPointerEnter={onInviteMembersIntent}
                                                    >
                                                        <InviteMembersIcon />
                                                        <span>{t("sidebar.inviteMembers")}</span>
                                                    </SidebarMenuButton>
                                                </SidebarMenuItem>
                                            )}
                                        </SidebarMenu>
                                    </SidebarGroupContent>
                                </CollapsibleContent>
                            </SidebarGroup>
                        </Collapsible>
                    </div>

                    <div
                        className={`absolute inset-0 flex flex-col overflow-y-auto transition-[transform,opacity] duration-200 ${
                            showSubmenu
                                ? "translate-x-0 opacity-100"
                                : "pointer-events-none translate-x-2 opacity-0"
                        }`}
                    >
                        <SidebarGroup className="px-2">
                            <SidebarGroupContent>
                                <SidebarMenu>
                                    <SidebarMenuItem>
                                        <SidebarMenuButton
                                            onClick={() => setActiveSubmenu(null)}
                                            className="relative"
                                        >
                                            <ChevronLeft className="absolute left-2 h-4 w-4" />
                                            <span className="w-full text-center font-medium">
                                                {activeSubmenuLabel}
                                            </span>
                                        </SidebarMenuButton>
                                    </SidebarMenuItem>

                                    {activeSubItems.map((subItem) => {
                                        const SubIcon = subItem.icon
                                        const subUrl = subItem.buildUrl(slug)
                                        return (
                                            <SidebarMenuItem key={subItem.title}>
                                                <SidebarMenuButton
                                                    asChild
                                                    isActive={isOrgUrlActive(
                                                        subUrl,
                                                        visiblePathname
                                                    )}
                                                >
                                                    <Link
                                                        to={subUrl}
                                                        onClick={() => {
                                                            recordSidebarNavigationIntent(
                                                                subUrl,
                                                                "click",
                                                                subItem.title
                                                            )
                                                        }}
                                                        onFocus={() =>
                                                            recordSidebarNavigationIntent(
                                                                subUrl,
                                                                "focus",
                                                                subItem.title
                                                            )
                                                        }
                                                        onPointerEnter={() =>
                                                            recordSidebarNavigationIntent(
                                                                subUrl,
                                                                "hover",
                                                                subItem.title
                                                            )
                                                        }
                                                    >
                                                        {SubIcon && <SubIcon />}
                                                        <span>{t(subItem.titleKey)}</span>
                                                    </Link>
                                                </SidebarMenuButton>
                                            </SidebarMenuItem>
                                        )
                                    })}
                                </SidebarMenu>
                            </SidebarGroupContent>
                        </SidebarGroup>
                    </div>
                </div>
            </SidebarContent>
            {showSetupChecklist && setupStatus && (
                <SidebarFooter>
                    <OrgSidebarSetupChecklist
                        status={setupStatus}
                        organizationSlug={slug}
                        onNavigationIntent={recordSidebarNavigationIntent}
                    />
                </SidebarFooter>
            )}
            <OrgSidebarCollapseTrigger />
        </Sidebar>
    )
}

function OrgSidebarCollapseTrigger() {
    const { t } = useTranslation("common")
    const { isMobile, state, toggleSidebar } = useSidebar()

    if (isMobile || state === "collapsed") return null

    return (
        <div className="group/sidebar-collapse-zone absolute inset-y-2 -right-2 z-30 hidden w-3 translate-x-1/2 md:block">
            <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 transition-opacity duration-150 group-focus-within/sidebar-collapse-zone:pointer-events-auto group-focus-within/sidebar-collapse-zone:opacity-100 group-hover/sidebar-collapse-zone:pointer-events-auto group-hover/sidebar-collapse-zone:opacity-100">
                <Button
                    variant="outline"
                    size="icon-xs"
                    radius="full"
                    type="button"
                    aria-label={t("action.closeNavigation")}
                    onClick={toggleSidebar}
                >
                    <ChevronLeft className="size-3.5" />
                </Button>
            </div>
        </div>
    )
}

interface OrgSidebarOrganizationLinkProps {
    organization: OrganizationWorkspaceSummary
    dashboardUrl: string
    onIntent: (href: string, intent: "click" | "focus" | "hover") => void
}

function OrgSidebarOrganizationLink({
    organization,
    dashboardUrl,
    onIntent,
}: OrgSidebarOrganizationLinkProps) {
    const { t } = useTranslation("workspace")
    const memberCount = organization.memberCount
    const hasMemberCount = typeof memberCount === "number"

    return (
        <div className="shrink-0 px-2 pt-1 pb-2">
            <Link
                to={dashboardUrl}
                className="flex h-12 w-full items-center gap-2 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-ds-sidebar-ring/40"
                onClick={() => onIntent(dashboardUrl, "click")}
                onFocus={() => onIntent(dashboardUrl, "focus")}
                onPointerEnter={() => onIntent(dashboardUrl, "hover")}
            >
                <OrgSidebarOrganizationLogo organization={organization} />
                <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ds-fg-muted text-sm leading-4">
                        {organization.name}
                    </span>
                    {hasMemberCount && (
                        <span className="mt-1 block truncate text-[12px] text-ds-fg-subtle leading-3">
                            {t("sidebar.memberCount", { count: memberCount })}
                        </span>
                    )}
                </span>
            </Link>
        </div>
    )
}

interface OrgSidebarOrganizationLogoProps {
    organization: OrganizationWorkspaceSummary
}

function OrgSidebarOrganizationLogo({ organization }: OrgSidebarOrganizationLogoProps) {
    const fallbackText = getOrganizationFallbackText(organization.name)

    return (
        <span className="relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-ds-sidebar-border bg-ds-surface font-semibold text-[10px] text-ds-fg">
            {organization.logo ? (
                <img
                    src={organization.logo}
                    alt={`${organization.name} logo`}
                    className="absolute inset-0 size-full object-cover"
                />
            ) : (
                <span>{fallbackText}</span>
            )}
        </span>
    )
}

function getOrganizationFallbackText(name: string): string {
    const normalizedName = name.trim()
    return normalizedName ? normalizedName.charAt(0).toUpperCase() : "O"
}
