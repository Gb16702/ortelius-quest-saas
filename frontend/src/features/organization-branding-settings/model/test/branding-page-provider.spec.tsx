import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import "@/shared/lib/i18n/marketing"
import {
    type OrganizationBrandingSettings,
    type OrganizationInfo,
    type OrganizationSetupStatus,
    organizationSettingsKeys,
    organizationSetupKeys,
} from "@/entities/organization"
import { ensureAppLanguageResources } from "@/shared/lib/i18n/marketing"
import { server } from "@/shared/test/msw/msw-server"
import { createTestQueryClient } from "@/shared/test/render/query-client.factory"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { Toaster } from "@/shared/ui/sonner"
import { toast } from "@/shared/ui/toasts"
import { BrandingPageProvider, useBrandingPage } from "../branding-page.provider"

const originalLinkHrefDescriptor = Object.getOwnPropertyDescriptor(
    HTMLLinkElement.prototype,
    "href"
)
const linkHrefByElement = new WeakMap<HTMLLinkElement, string>()

const organizationInfo: OrganizationInfo = {
    id: "org-1",
    name: "Acme Logistics",
    slug: "acme",
    logo: null,
    tagline: null,
    overview: null,
    website: null,
    taxIdType: null,
    taxIdNumber: null,
    emailIntakeEnabled: false,
    brandColor: "#0103B8",
    font: "geist",
}

const brandingSettings: OrganizationBrandingSettings = {
    id: organizationInfo.id,
    name: organizationInfo.name,
    slug: organizationInfo.slug,
    logo: organizationInfo.logo,
    tagline: organizationInfo.tagline,
    overview: organizationInfo.overview,
    website: organizationInfo.website,
    brandColor: organizationInfo.brandColor,
    font: organizationInfo.font,
}

const setupStatus: OrganizationSetupStatus = {
    hasLogo: false,
    hasTagline: false,
    hasOverview: false,
    hasServices: false,
    hasCargoTypes: false,
    hasVatConfig: false,
    hasLegalDocuments: false,
    memberCount: 2,
    isComplete: false,
}

function createDeferred() {
    let resolve!: () => void
    const promise = new Promise<void>((resolvePromise) => {
        resolve = resolvePromise
    })

    return { promise, resolve }
}

function BrandingMutationHarness() {
    const { actions } = useBrandingPage()

    return (
        <>
            <button
                type="button"
                onClick={() => actions.saveOrganizationName({ name: "Acme Air" })}
            >
                Save Name
            </button>
            <button
                type="button"
                onClick={() => {
                    void actions.saveWorkspaceUrl({ slug: "acme-air" })
                }}
            >
                Save URL
            </button>
            <button type="button" onClick={() => actions.saveOrganizationFont("roboto")}>
                Save Roboto
            </button>
            <button type="button" onClick={() => actions.saveOrganizationBrandColor("#3183D8")}>
                Save Signal Azure
            </button>
            <button type="button" onClick={() => actions.saveTagline({ tagline: "Fast cargo" })}>
                Save Tagline
            </button>
            <button
                type="button"
                onClick={() => actions.saveOverview({ overview: "Air cargo specialists" })}
            >
                Save Overview
            </button>
            <Toaster />
        </>
    )
}

describe("BrandingPageProvider", () => {
    setupMswServer()

    beforeEach(async () => {
        await ensureAppLanguageResources("en")
        Object.defineProperty(HTMLLinkElement.prototype, "href", {
            configurable: true,
            get(this: HTMLLinkElement) {
                return linkHrefByElement.get(this) ?? ""
            },
            set(this: HTMLLinkElement, value: string) {
                linkHrefByElement.set(this, value)
            },
        })
    })

    afterEach(() => {
        if (originalLinkHrefDescriptor) {
            Object.defineProperty(HTMLLinkElement.prototype, "href", originalLinkHrefDescriptor)
        }
        toast.dismiss()
        document.documentElement.removeAttribute("style")
        document.getElementById("organization-font-stylesheet")?.remove()
    })

    it("shows a pending toast and applies font changes optimistically", async () => {
        const queryClient = createTestQueryClient()
        const queryKey = organizationSettingsKeys.detail(organizationInfo.id)
        queryClient.setQueryData(queryKey, organizationInfo)
        const patchGate = createDeferred()
        const patchPayloads: unknown[] = []

        server.use(
            http.patch("http://localhost/api/organizations/:orgId", async ({ request }) => {
                patchPayloads.push(await request.json())
                await patchGate.promise
                return HttpResponse.json({ success: true })
            })
        )

        const { user } = renderWithProviders(
            <BrandingPageProvider orgInfo={brandingSettings}>
                <BrandingMutationHarness />
            </BrandingPageProvider>,
            { queryClient }
        )

        await user.click(screen.getByRole("button", { name: "Save Roboto" }))

        expect(queryClient.getQueryData<OrganizationInfo>(queryKey)?.font).toBe("roboto")
        expect(document.documentElement.style.getPropertyValue("--font-sans")).toContain("Roboto")
        await screen.findByText("Saving font...")
        await waitFor(() => expect(patchPayloads).toEqual([{ font: "roboto" }]))

        patchGate.resolve()

        await screen.findByText("Font updated")
        expect(screen.queryByText("View home page")).toBeNull()
    })

    it("shows a pending toast and applies brand color changes optimistically", async () => {
        const queryClient = createTestQueryClient()
        const queryKey = organizationSettingsKeys.detail(organizationInfo.id)
        queryClient.setQueryData(queryKey, organizationInfo)
        const patchGate = createDeferred()
        const patchPayloads: unknown[] = []

        server.use(
            http.patch("http://localhost/api/organizations/:orgId", async ({ request }) => {
                patchPayloads.push(await request.json())
                await patchGate.promise
                return HttpResponse.json({ success: true })
            })
        )

        const { user } = renderWithProviders(
            <BrandingPageProvider orgInfo={brandingSettings}>
                <BrandingMutationHarness />
            </BrandingPageProvider>,
            { queryClient }
        )

        await user.click(screen.getByRole("button", { name: "Save Signal Azure" }))

        expect(queryClient.getQueryData<OrganizationInfo>(queryKey)?.brandColor).toBe("#3183D8")
        expect(document.documentElement.style.getPropertyValue("--color-ds-accent-700")).toBe(
            "#3183D8"
        )
        await screen.findByText("Saving brand color...")
        await waitFor(() => expect(patchPayloads).toEqual([{ brandColor: "#3183D8" }]))

        patchGate.resolve()

        await screen.findByText("Brand color updated")
        expect(screen.queryByText("View home page")).toBeNull()
    })

    it("saves organization display name without checking uniqueness", async () => {
        const queryClient = createTestQueryClient()
        const queryKey = organizationSettingsKeys.detail(organizationInfo.id)
        queryClient.setQueryData(queryKey, organizationInfo)
        const patchPayloads: unknown[] = []

        server.use(
            http.patch("http://localhost/api/organizations/:orgId", async ({ request }) => {
                patchPayloads.push(await request.json())
                return HttpResponse.json({ success: true })
            })
        )

        const { user } = renderWithProviders(
            <BrandingPageProvider orgInfo={brandingSettings}>
                <BrandingMutationHarness />
            </BrandingPageProvider>,
            { queryClient }
        )

        await user.click(screen.getByRole("button", { name: "Save Name" }))

        await waitFor(() => expect(patchPayloads).toEqual([{ name: "Acme Air" }]))
        expect(queryClient.getQueryData<OrganizationInfo>(queryKey)?.name).toBe("Acme Air")
    })

    it("updates the setup status cache optimistically when tagline is saved", async () => {
        const queryClient = createTestQueryClient()
        const organizationInfoKey = organizationSettingsKeys.detail(organizationInfo.id)
        const setupQueryKey = organizationSetupKeys.detail(organizationInfo.id)
        queryClient.setQueryData(organizationInfoKey, organizationInfo)
        queryClient.setQueryData(setupQueryKey, setupStatus)
        const patchGate = createDeferred()

        server.use(
            http.patch("http://localhost/api/organizations/:orgId", async () => {
                await patchGate.promise
                return HttpResponse.json({ success: true })
            })
        )

        const { user } = renderWithProviders(
            <BrandingPageProvider orgInfo={brandingSettings}>
                <BrandingMutationHarness />
            </BrandingPageProvider>,
            { queryClient }
        )

        await user.click(screen.getByRole("button", { name: "Save Tagline" }))

        expect(queryClient.getQueryData<OrganizationSetupStatus>(setupQueryKey)?.hasTagline).toBe(
            true
        )

        patchGate.resolve()
        await screen.findByText("Organization tagline updated")
    })

    it("updates the setup status cache optimistically when overview is saved", async () => {
        const queryClient = createTestQueryClient()
        const organizationInfoKey = organizationSettingsKeys.detail(organizationInfo.id)
        const setupQueryKey = organizationSetupKeys.detail(organizationInfo.id)
        queryClient.setQueryData(organizationInfoKey, organizationInfo)
        queryClient.setQueryData(setupQueryKey, setupStatus)
        const patchGate = createDeferred()

        server.use(
            http.patch("http://localhost/api/organizations/:orgId", async () => {
                await patchGate.promise
                return HttpResponse.json({ success: true })
            })
        )

        const { user } = renderWithProviders(
            <BrandingPageProvider orgInfo={brandingSettings}>
                <BrandingMutationHarness />
            </BrandingPageProvider>,
            { queryClient }
        )

        await user.click(screen.getByRole("button", { name: "Save Overview" }))

        expect(queryClient.getQueryData<OrganizationSetupStatus>(setupQueryKey)?.hasOverview).toBe(
            true
        )

        patchGate.resolve()
        await screen.findByText("Organization overview updated")
    })

    it("shows a pending toast and applies organization URL changes optimistically", async () => {
        const queryClient = createTestQueryClient()
        const queryKey = organizationSettingsKeys.detail(organizationInfo.id)
        queryClient.setQueryData(queryKey, organizationInfo)
        const patchGate = createDeferred()
        const patchPayloads: unknown[] = []
        const slugChecks: string[] = []

        server.use(
            http.get("http://localhost/api/onboarding/check-organization-slug", ({ request }) => {
                slugChecks.push(new URL(request.url).searchParams.get("slug") ?? "")
                return HttpResponse.json({ available: true })
            }),
            http.patch("http://localhost/api/organizations/:orgId", async ({ request }) => {
                patchPayloads.push(await request.json())
                await patchGate.promise
                return HttpResponse.json({ success: true })
            })
        )

        const { user } = renderWithProviders(
            <BrandingPageProvider orgInfo={brandingSettings}>
                <BrandingMutationHarness />
            </BrandingPageProvider>,
            { queryClient }
        )

        await user.click(screen.getByRole("button", { name: "Save URL" }))

        await waitFor(() => expect(slugChecks).toEqual(["acme-air"]))
        await waitFor(() => expect(patchPayloads).toEqual([{ slug: "acme-air" }]))
        expect(queryClient.getQueryData<OrganizationInfo>(queryKey)?.slug).toBe("acme-air")
        await screen.findByText("Updating organization URL...")

        patchGate.resolve()

        await screen.findByText("Organization URL updated")
    })

    it("does not patch the organization URL when the slug is unavailable", async () => {
        const queryClient = createTestQueryClient()
        const queryKey = organizationSettingsKeys.detail(organizationInfo.id)
        queryClient.setQueryData(queryKey, organizationInfo)
        const patchPayloads: unknown[] = []

        server.use(
            http.get("http://localhost/api/onboarding/check-organization-slug", () =>
                HttpResponse.json({ available: false, errorCode: "SUBDOMAIN_TAKEN" })
            ),
            http.patch("http://localhost/api/organizations/:orgId", async ({ request }) => {
                patchPayloads.push(await request.json())
                return HttpResponse.json({ success: true })
            })
        )

        const { user } = renderWithProviders(
            <BrandingPageProvider orgInfo={brandingSettings}>
                <BrandingMutationHarness />
            </BrandingPageProvider>,
            { queryClient }
        )

        await user.click(screen.getByRole("button", { name: "Save URL" }))

        await waitFor(() =>
            expect(queryClient.getQueryData<OrganizationInfo>(queryKey)?.slug).toBe("acme")
        )
        expect(patchPayloads).toEqual([])
    })
})
