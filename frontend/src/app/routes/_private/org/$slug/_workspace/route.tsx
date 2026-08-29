import { createFileRoute, Outlet, useMatches } from "@tanstack/react-router"
import { useCallback, useEffect } from "react"
import { loadPrivateAppLanguage } from "@/app/model/app-language"
import { resolveMarketingHomePath } from "@/app/model/marketing-language"
import { loadOrgWorkspaceRouteContext } from "@/app/model/org-workspace-session"
import { OrgWorkspaceIntegrations } from "@/app/providers/org-workspace-integrations"
import { RootRuntimeShell } from "@/app/providers/root-runtime-shell"
import { AppLanguageProvider } from "@/shared/lib/i18n/app-language.context"
import { defaultLanguage } from "@/shared/lib/i18n/marketing-languages"
import { OrgLayoutShell } from "@/widgets/layout"

export const Route = createFileRoute("/_private/org/$slug/_workspace")({
    ssr: false,
    staleTime: 30_000,
    beforeLoad: async ({ context, location, params }) => {
        const routeContext = await loadOrgWorkspaceRouteContext({
            context,
            location,
            slug: params.slug,
        })

        const lang = await loadPrivateAppLanguage(routeContext.user)
        return { ...routeContext, lang }
    },
    pendingComponent: OrgLayoutPendingRoute,
    component: OrgLayoutRoute,
})

function OrgLayoutPendingRoute() {
    return (
        <div className="flex h-dvh overflow-hidden bg-ds-sidebar-canvas text-ds-fg">
            <aside aria-hidden="true" className="hidden w-68 shrink-0 md:block">
                <div className="fixed inset-y-0 left-0 hidden h-svh w-68 bg-ds-sidebar-surface p-2 md:flex">
                    <div className="h-full w-full rounded-md bg-ds-sidebar-canvas" />
                </div>
            </aside>
            <div className="flex min-w-0 flex-1 flex-col bg-ds-sidebar-canvas md:m-2 md:mt-0 md:ml-0">
                <div aria-hidden="true" className="h-14 shrink-0" />
                <main className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-ds-surface-border bg-ds-surface">
                    <section aria-hidden="true" className="min-h-0 flex-1 bg-ds-canvas" />
                </main>
            </div>
        </div>
    )
}

function OrgLayoutRoute() {
    const navigate = Route.useNavigate()
    const { sessionData, user, orgLayoutData, lang } = Route.useRouteContext()
    const handleMarketingHomeNavigate = useCallback(() => {
        void resolveMarketingHomePath().then(
            (href) => navigate({ href }),
            () => navigate({ href: `/${defaultLanguage}/home` })
        )
    }, [navigate])

    return (
        <AppLanguageProvider initialLang={lang}>
            <OrgDocumentTitle organizationName={orgLayoutData.org.name} />
            <RootRuntimeShell sessionData={sessionData} user={user}>
                <OrgWorkspaceIntegrations
                    data={orgLayoutData}
                    sessionData={sessionData}
                    onNavigate={(href) => {
                        navigate({ href })
                    }}
                >
                    {({
                        notifications,
                        onInviteMembers,
                        onInviteMembersIntent,
                        onShareCompanyPage,
                        onShareCompanyPageIntent,
                        onViewUserProfile,
                        onViewUserProfileIntent,
                        onRouteDataIntent,
                    }) => (
                        <OrgLayoutShell
                            sessionData={sessionData}
                            slug={orgLayoutData.slug}
                            onMarketingHomeNavigate={handleMarketingHomeNavigate}
                            notifications={notifications}
                            onInviteMembers={onInviteMembers}
                            onInviteMembersIntent={onInviteMembersIntent}
                            onShareCompanyPage={onShareCompanyPage}
                            onShareCompanyPageIntent={onShareCompanyPageIntent}
                            onViewUserProfile={onViewUserProfile}
                            onViewUserProfileIntent={onViewUserProfileIntent}
                            onRouteDataIntent={onRouteDataIntent}
                        >
                            <Outlet />
                        </OrgLayoutShell>
                    )}
                </OrgWorkspaceIntegrations>
            </RootRuntimeShell>
        </AppLanguageProvider>
    )
}

function OrgDocumentTitle({ organizationName }: { organizationName: string }) {
    const titleSuffix = useMatches({ select: getDeepestRouteTitleSuffix })

    useOrgDocumentTitle({
        organizationName,
        titleSuffix,
    })

    return null
}

function useOrgDocumentTitle({
    organizationName,
    titleSuffix,
}: {
    organizationName: string
    titleSuffix: string | null
}) {
    useEffect(() => {
        if (!titleSuffix) return

        document.title = titleSuffix.startsWith(`${organizationName} › `)
            ? titleSuffix
            : `${organizationName} › ${titleSuffix}`
    }, [organizationName, titleSuffix])
}

function getDeepestRouteTitleSuffix(
    matches: ReadonlyArray<{ staticData?: { orgTitleSections?: unknown } }>
): string | null {
    for (let index = matches.length - 1; index >= 0; index -= 1) {
        const sections = matches[index]?.staticData?.orgTitleSections
        if (isTitleSections(sections)) return sections.join(" › ")
    }

    return null
}

function isTitleSections(value: unknown): value is [string, ...string[]] {
    return (
        Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string")
    )
}
