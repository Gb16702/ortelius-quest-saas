import { afterEach, beforeEach, describe, expect, it } from "bun:test"
import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import "@/shared/lib/i18n/marketing"
import {
    type OrganizationInfo,
    type OrganizationSetupStatus,
    organizationSettingsKeys,
    organizationSetupKeys,
    useOrganizationBusinessSettings,
} from "@/entities/organization"
import type { OrganizationBusinessCatalogItem } from "@/entities/organization-business-catalog"
import { ensureAppLanguageResources } from "@/shared/lib/i18n/marketing"
import { server } from "@/shared/test/msw/msw-server"
import { createTestQueryClient } from "@/shared/test/render/query-client.factory"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { Toaster } from "@/shared/ui/sonner"
import { toast } from "@/shared/ui/toasts"
import { BusinessPageProvider, useBusinessPage } from "../business-page.provider"

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

const setupStatus: OrganizationSetupStatus = {
    hasLogo: true,
    hasTagline: true,
    hasOverview: true,
    hasServices: false,
    hasCargoTypes: false,
    hasVatConfig: false,
    hasLegalDocuments: false,
    memberCount: 2,
    isComplete: false,
}

const serviceItem: OrganizationBusinessCatalogItem = {
    id: "service-1",
    name: "Air freight",
    slug: "air-freight",
    type: "service",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    isSelected: false,
}

function createDeferred() {
    let resolve!: () => void
    const promise = new Promise<void>((resolvePromise) => {
        resolve = resolvePromise
    })

    return { promise, resolve }
}

function BusinessSettingsHarness() {
    const organizationInfoQuery = useOrganizationBusinessSettings(organizationInfo.id)
    const orgInfo = organizationInfoQuery.data

    if (!orgInfo) return null

    return (
        <BusinessPageProvider orgInfo={orgInfo} initialCategories={[]} initialServices={[]}>
            <EmailIntakeHarness />
            <Toaster />
        </BusinessPageProvider>
    )
}

function EmailIntakeHarness() {
    const { state, actions } = useBusinessPage()

    return (
        <>
            <output aria-label="Email intake state">
                {state.emailIntakeEnabled ? "enabled" : "disabled"}
            </output>
            <button type="button" onClick={() => actions.toggleEmailIntake(true)}>
                Enable email intake
            </button>
        </>
    )
}

function ServicesSetupHarness() {
    const organizationInfoQuery = useOrganizationBusinessSettings(organizationInfo.id)
    const orgInfo = organizationInfoQuery.data

    if (!orgInfo) return null

    return (
        <BusinessPageProvider
            orgInfo={orgInfo}
            initialCategories={[]}
            initialServices={[serviceItem]}
        >
            <ServicesMutationHarness />
            <Toaster />
        </BusinessPageProvider>
    )
}

function ServicesMutationHarness() {
    const { actions } = useBusinessPage()

    return (
        <>
            <button type="button" onClick={() => actions.toggleService(serviceItem.id, true)}>
                Select service
            </button>
            <button type="button" onClick={() => actions.saveServices()}>
                Save services
            </button>
        </>
    )
}

describe("BusinessPageProvider", () => {
    setupMswServer()

    beforeEach(async () => {
        await ensureAppLanguageResources("en")
    })

    afterEach(() => {
        toast.dismiss()
    })

    it("shows a pending toast and applies email intake changes optimistically", async () => {
        const queryClient = createTestQueryClient()
        const queryKey = organizationSettingsKeys.detail(organizationInfo.id)
        queryClient.setQueryData(queryKey, organizationInfo)
        const patchGate = createDeferred()
        const patchPayloads: unknown[] = []

        server.use(
            http.patch(
                "http://localhost/api/organizations/:orgId/email-intake",
                async ({ request }) => {
                    patchPayloads.push(await request.json())
                    await patchGate.promise
                    return HttpResponse.json({ success: true })
                }
            )
        )

        const { user } = renderWithProviders(<BusinessSettingsHarness />, { queryClient })

        expect(screen.getByLabelText("Email intake state")).toHaveTextContent("disabled")

        await user.click(screen.getByRole("button", { name: "Enable email intake" }))

        expect(queryClient.getQueryData<OrganizationInfo>(queryKey)?.emailIntakeEnabled).toBe(true)
        expect(screen.getByLabelText("Email intake state")).toHaveTextContent("enabled")
        await screen.findByText("Enabling email intake...")
        await waitFor(() => expect(patchPayloads).toEqual([{ enabled: true }]))

        patchGate.resolve()

        await screen.findByText("Email intake enabled")
        expect(queryClient.getQueryData<OrganizationInfo>(queryKey)?.emailIntakeEnabled).toBe(true)
    })

    it("updates the setup status cache optimistically when services are saved", async () => {
        const queryClient = createTestQueryClient()
        const organizationInfoKey = organizationSettingsKeys.detail(organizationInfo.id)
        const setupQueryKey = organizationSetupKeys.detail(organizationInfo.id)
        queryClient.setQueryData(organizationInfoKey, organizationInfo)
        queryClient.setQueryData(setupQueryKey, setupStatus)
        const patchGate = createDeferred()

        server.use(
            http.get("http://localhost/api/organizations/:orgId/:catalogPath/all", ({ params }) =>
                HttpResponse.json({
                    success: true,
                    data: params.catalogPath === "services" ? [serviceItem] : [],
                })
            ),
            http.patch(
                "http://localhost/api/organizations/:orgId/services",
                async ({ request }) => {
                    expect(await request.json()).toEqual({ add: [serviceItem.id] })
                    await patchGate.promise
                    return HttpResponse.json({ success: true })
                }
            )
        )

        const { user } = renderWithProviders(<ServicesSetupHarness />, { queryClient })

        await user.click(screen.getByRole("button", { name: "Select service" }))
        await user.click(screen.getByRole("button", { name: "Save services" }))

        expect(queryClient.getQueryData<OrganizationSetupStatus>(setupQueryKey)?.hasServices).toBe(
            true
        )

        patchGate.resolve()
        await screen.findByText("Services updated")
    })
})
