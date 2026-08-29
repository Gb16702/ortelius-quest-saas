import { createFileRoute, Outlet, redirect } from "@tanstack/react-router"
import { useCallback } from "react"
import { loadPrivateAppLanguage } from "@/app/model/app-language"
import { resolveMarketingHomePath } from "@/app/model/marketing-language"
import { isAuthenticatedMeRouteSession, resolveMeRouteSession } from "@/app/model/me-route-session"
import { MeWorkspaceIntegrations } from "@/app/providers/me-workspace-integrations"
import { RootRuntimeShell } from "@/app/providers/root-runtime-shell"
import { AppLanguageProvider } from "@/shared/lib/i18n/app-language.context"
import { defaultLanguage } from "@/shared/lib/i18n/marketing-languages"
import { MeLayoutShell } from "@/widgets/layout"

export const Route = createFileRoute("/_private/me")({
    ssr: false,
    beforeLoad: async ({ context, location }) => {
        const session = await resolveMeRouteSession(context)
        if (!isAuthenticatedMeRouteSession(session)) {
            throw redirect({
                to: "/sign-in",
                search: { redirect: location.href },
                replace: true,
            })
        }

        const lang = await loadPrivateAppLanguage(session.user)
        return { ...session, lang }
    },
    pendingComponent: MeLayoutPendingRoute,
    component: MeLayoutRoute,
})

function MeLayoutPendingRoute() {
    return (
        <div className="flex h-dvh overflow-hidden bg-ds-sidebar-canvas text-ds-fg">
            <aside
                aria-hidden="true"
                className="hidden w-68 shrink-0 bg-ds-sidebar-surface md:block"
            />
            <div className="flex min-w-0 flex-1 flex-col bg-ds-sidebar-canvas md:m-2 md:mt-0 md:ml-0">
                <div aria-hidden="true" className="h-14 shrink-0" />
                <main className="flex min-h-0 flex-1 overflow-hidden rounded-lg border border-ds-surface-border bg-ds-surface">
                    <section aria-hidden="true" className="min-h-0 flex-1 bg-ds-canvas" />
                </main>
            </div>
        </div>
    )
}

function MeLayoutRoute() {
    const navigate = Route.useNavigate()
    const { sessionData, user, activeOrganization, lang } = Route.useRouteContext()
    const handleMarketingHomeNavigate = useCallback(() => {
        void resolveMarketingHomePath().then(
            (href) => navigate({ href }),
            () => navigate({ href: `/${defaultLanguage}/home` })
        )
    }, [navigate])

    return (
        <AppLanguageProvider initialLang={lang}>
            <RootRuntimeShell sessionData={sessionData} user={user}>
                <MeWorkspaceIntegrations
                    sessionData={sessionData}
                    activeOrganization={activeOrganization}
                    onNavigate={(href) => {
                        navigate({ href })
                    }}
                >
                    {({ notifications }) => (
                        <MeLayoutShell
                            sessionData={sessionData}
                            activeOrganization={activeOrganization}
                            onMarketingHomeNavigate={handleMarketingHomeNavigate}
                            notifications={notifications}
                        >
                            <Outlet />
                        </MeLayoutShell>
                    )}
                </MeWorkspaceIntegrations>
            </RootRuntimeShell>
        </AppLanguageProvider>
    )
}
