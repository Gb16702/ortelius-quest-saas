import { createFileRoute } from "@tanstack/react-router"
import { loadPublicAppLanguage } from "@/app/model/app-language"
import { loadOrganizationShowcase } from "@/app/model/organization-showcase-route-data"
import { getCurrentOrigin } from "@/app/model/route-origin"
import { convertHeadEntriesToStartHead } from "@/app/model/route-seo-head"
import { buildOrgMetaForRoute } from "@/app/seo/meta-builders"
import {
    getOrganizationFontStylesheetHref,
    ORGANIZATION_FONT_STYLESHEET_LINK_ID,
} from "@/entities/organization"
import {
    OrganizationShowcaseErrorPage,
    OrganizationShowcasePage,
} from "@/pages/organization-showcase"
import { ensureAppLanguageResources } from "@/shared/lib/i18n/marketing"

export const Route = createFileRoute("/_public/$lang/org/$slug/")({
    loader: async ({ location, params }) => {
        const lang = await loadPublicAppLanguage(
            params.lang,
            `/org/${params.slug}`,
            location.searchStr
        )
        const appLanguageResources = ensureAppLanguageResources(lang)
        const data = await loadOrganizationShowcase({ data: { slug: params.slug } })

        await appLanguageResources
        return { data, lang }
    },
    head: ({ loaderData, params }) => {
        if (!loaderData?.data?.showcaseData) {
            return {
                meta: [
                    { title: "Organization not found — Ortelius Quest" },
                    { name: "robots", content: "noindex, nofollow" },
                ],
            }
        }

        const origin = getCurrentOrigin()
        const head = convertHeadEntriesToStartHead(
            buildOrgMetaForRoute({
                matches: [{ id: "start-root", data: { url: origin } }],
                slug: params.slug,
                organization: loaderData.data.showcaseData.organization,
                services: loaderData.data.showcaseData.services,
                cargoTypes: loaderData.data.showcaseData.cargoTypes,
            })
        )

        return {
            meta: head.meta,
            links: [
                ...head.links,
                {
                    id: ORGANIZATION_FONT_STYLESHEET_LINK_ID,
                    rel: "stylesheet",
                    href: getOrganizationFontStylesheetHref(
                        loaderData.data.showcaseData.organization.font
                    ),
                },
            ],
            scripts: head.scripts,
        }
    },
    component: OrganizationShowcaseRoute,
})

function OrganizationShowcaseRoute() {
    const { data, lang } = Route.useLoaderData()

    if (!data) return <OrganizationShowcaseErrorPage variant="not-found" />

    return <OrganizationShowcasePage {...data} lang={lang} />
}
