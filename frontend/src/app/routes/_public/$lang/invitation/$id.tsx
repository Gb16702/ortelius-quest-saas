import { createFileRoute, redirect } from "@tanstack/react-router"
import { loadPublicAppLanguage } from "@/app/model/app-language"
import { loadTanstackInvitationData } from "@/app/model/invitation-route-data"
import { InvitationPage } from "@/pages/invitation"
import { ensureAppLanguageResources } from "@/shared/lib/i18n/marketing"

export const Route = createFileRoute("/_public/$lang/invitation/$id")({
    ssr: false,
    loader: async ({ context, location, params }) => {
        const lang = await loadPublicAppLanguage(
            params.lang,
            `/invitation/${params.id}`,
            location.searchStr
        )

        const appLanguageResources = ensureAppLanguageResources(lang)
        const result = await loadTanstackInvitationData({
            activeOrganization: context.activeOrganization,
            invitationId: params.id,
            user: context.user,
        })

        await appLanguageResources

        if ("redirectTo" in result) {
            throw redirect({
                href: result.redirectTo,
                replace: true,
            })
        }

        return { ...result, lang }
    },
    component: InvitationRoute,
})

function InvitationRoute() {
    const navigate = Route.useNavigate()
    const loaderData = Route.useLoaderData()

    return (
        <InvitationPage
            loaderData={{
                ...loaderData,
                url: typeof window === "undefined" ? "" : window.location.href,
            }}
            onNavigate={(href) => {
                navigate({ href })
            }}
        />
    )
}
