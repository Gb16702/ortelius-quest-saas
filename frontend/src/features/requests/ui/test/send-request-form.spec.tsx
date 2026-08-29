import { beforeEach, describe, expect, it, mock } from "bun:test"

mock.module("@/entities/session", () => ({
    useUser: () => null,
}))

import { screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { server } from "@/shared/test/msw/msw-server"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { catalogHandlers } from "../../api/test/catalog-handlers"
import { clearSendRequestDraft, useSendRequestStore } from "../../model/use-send-request.store"
import { SendRequestForm } from "../send-request/send-request-form"

interface SeedDraft {
    firstName: string
    lastName: string
    email: string
    fromDate: string
    toDate: string
    selectedCategories: string[]
    selectedServices: string[]
    weight?: string
    volume?: string
    length?: string
    width?: string
    height?: string
    palletCount?: string
    additionalInfo?: string
    hazardous?: boolean
    insuranceCoverage?: boolean
    perishableGoods?: boolean
}

const FROM_DATE_ISO = "2030-06-01T00:00:00.000Z"
const TO_DATE_ISO = "2030-06-05T00:00:00.000Z"
const RECEIVER_ORG_ID = "organization-receiver"

function seedDraft(overrides: Partial<SeedDraft> = {}): SeedDraft {
    return {
        firstName: "Ada",
        lastName: "Lovelace",
        email: "ada@example.test",
        fromDate: FROM_DATE_ISO,
        toDate: TO_DATE_ISO,
        selectedCategories: ["category-1"],
        selectedServices: ["service-1"],
        weight: "12",
        volume: "3.4",
        length: "1.2",
        width: "0.8",
        height: "0.5",
        palletCount: "2",
        additionalInfo: "Please handle with care",
        hazardous: false,
        insuranceCoverage: true,
        perishableGoods: false,
        ...overrides,
    }
}

function seedSendRequestStore(draft: SeedDraft, lastCompletedStep: number) {
    useSendRequestStore.setState({
        data: {
            firstName: draft.firstName,
            lastName: draft.lastName,
            email: draft.email,
            dateRange: { from: draft.fromDate, to: draft.toDate },
            selectedCategories: draft.selectedCategories,
            selectedServices: draft.selectedServices,
            weight: draft.weight,
            volume: draft.volume,
            length: draft.length,
            width: draft.width,
            height: draft.height,
            palletCount: draft.palletCount,
            additionalInfo: draft.additionalInfo,
            hazardous: draft.hazardous ?? false,
            insuranceCoverage: draft.insuranceCoverage ?? false,
            perishableGoods: draft.perishableGoods ?? false,
        },
        errors: {},
        lastCompletedStep,
        _hasHydrated: true,
        _draftUpdatedAt: Date.now(),
    })
}

function resetSendRequestStore() {
    useSendRequestStore.setState({
        data: {},
        errors: {},
        lastCompletedStep: 0,
        _hasHydrated: true,
        _draftUpdatedAt: Date.now(),
    })
    clearSendRequestDraft()
}

type SubmitResponseFactory = () => Response

interface SubmitInterceptor {
    calls: Array<{ body: unknown }>
    response: SubmitResponseFactory
}

function installSubmitInterceptor(response?: SubmitResponseFactory): SubmitInterceptor {
    const interceptor: SubmitInterceptor = {
        calls: [],
        response: response ?? (() => HttpResponse.json({ success: true })),
    }

    server.use(
        http.post("/api/requests", async ({ request }) => {
            const body = (await request.json()) as unknown
            interceptor.calls.push({ body })
            return interceptor.response()
        })
    )

    return interceptor
}

function renderSendRequestForm(props: Partial<React.ComponentProps<typeof SendRequestForm>> = {}) {
    const onSuccess = props.onSuccess ?? (() => {})
    return renderWithProviders(
        <SendRequestForm
            subdomain="acme-logistics"
            receiverOrganizationId={props.receiverOrganizationId ?? RECEIVER_ORG_ID}
            initialStep={props.initialStep ?? 1}
            loginUrl={props.loginUrl}
            onClose={props.onClose}
            onSuccess={onSuccess}
        />,
        { userEventOptions: { pointerEventsCheck: 0 } }
    )
}

describe("SendRequestForm", () => {
    setupMswServer(...catalogHandlers)

    beforeEach(() => {
        if (typeof localStorage !== "undefined") {
            localStorage.clear()
        }
        resetSendRequestStore()
        if (typeof document !== "undefined") {
            document.body.innerHTML = ""
            document.body.removeAttribute("style")
            document.body.removeAttribute("data-scroll-locked")
            document.body.removeAttribute("aria-hidden")
        }
    })

    it("fires the create-request mutation with the expected payload when all steps are valid", async () => {
        const draft = seedDraft()
        seedSendRequestStore(draft, 3)
        const submit = installSubmitInterceptor()

        const { user } = renderSendRequestForm({ initialStep: 4 })

        const submitButton = await screen.findByRole("button", { name: /submit/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(submit.calls).toHaveLength(1)
        })

        const payload = submit.calls[0]?.body as Record<string, unknown>
        expect(payload.requesterEmail).toBe(draft.email)
        expect(payload.requesterName).toBe(`${draft.firstName} ${draft.lastName}`)
        expect(payload.categories).toEqual(draft.selectedCategories)
        expect(payload.services).toEqual(draft.selectedServices)
        expect(payload.fromDate).toBe(draft.fromDate)
        expect(payload.toDate).toBe(draft.toDate)
        expect(payload.receiverOrganizationId).toBe(RECEIVER_ORG_ID)
        expect(payload.comments).toBe(draft.additionalInfo)
        expect(payload.documents).toEqual([])

        const cargoDetails = payload.cargoDetails as Record<string, unknown>
        expect(cargoDetails.weight).toBe(12)
        expect(cargoDetails.volume).toBe(3.4)
        expect(cargoDetails.palletCount).toBe(2)
        const cargoOptions = cargoDetails.options as Record<string, unknown>
        expect(cargoOptions.hazardous).toBe(false)
        expect(cargoOptions.insuranceCoverage).toBe(true)
        expect(cargoOptions.perishableGoods).toBe(false)
        const dimensions = cargoDetails.dimensions as Record<string, unknown>
        expect(dimensions.length).toBe(1.2)
        expect(dimensions.width).toBe(0.8)
        expect(dimensions.height).toBe(0.5)
    })

    it("shows an accessible inline error and does not fire the mutation when a required field is missing", async () => {
        const draft = seedDraft({ firstName: "" })
        seedSendRequestStore(draft, 0)
        const submit = installSubmitInterceptor()

        const { user } = renderSendRequestForm({ initialStep: 1 })

        const continueButton = await screen.findByRole("button", { name: /continue/i })
        await user.click(continueButton)

        const alert = await screen.findByRole("alert")
        expect(alert).toHaveTextContent(/name is required/i)
        expect(submit.calls).toHaveLength(0)
    })

    it("rejects a negative cargo value with an inline error and does not fire the mutation", async () => {
        const draft = seedDraft({ weight: "-5" })
        seedSendRequestStore(draft, 3)
        const submit = installSubmitInterceptor()

        const { user } = renderSendRequestForm({ initialStep: 4 })

        const submitButton = await screen.findByRole("button", { name: /submit/i })
        await user.click(submitButton)

        const alerts = await screen.findAllByRole("alert")
        expect(alerts.length).toBeGreaterThan(0)
        expect(submit.calls).toHaveLength(0)
    })

    it("keeps the submit button enabled after invalid submission (validate-on-click convention)", async () => {
        const draft = seedDraft({ firstName: "" })
        seedSendRequestStore(draft, 0)
        installSubmitInterceptor()

        const { user } = renderSendRequestForm({ initialStep: 1 })

        const continueButton = await screen.findByRole("button", { name: /continue/i })
        expect(continueButton).not.toBeDisabled()

        await user.click(continueButton)

        const continueButtonAfter = await screen.findByRole("button", { name: /continue/i })
        expect(continueButtonAfter).not.toBeDisabled()
    })

    it("preserves entered data when navigating Back and Next between steps", async () => {
        const draft = seedDraft()
        seedSendRequestStore(draft, 3)
        installSubmitInterceptor()

        const { user } = renderSendRequestForm({ initialStep: 4 })

        const backButton = await screen.findByRole("button", { name: /back/i })
        await user.click(backButton)

        await screen.findByRole("button", { name: /continue/i })

        expect(useSendRequestStore.getState().data.selectedServices).toEqual(draft.selectedServices)
        expect(useSendRequestStore.getState().data.weight).toBe(draft.weight)
        expect(useSendRequestStore.getState().data.additionalInfo).toBe(draft.additionalInfo)

        const continueAgain = await screen.findByRole("button", { name: /continue/i })
        await user.click(continueAgain)

        await screen.findByRole("button", { name: /submit/i })

        expect(useSendRequestStore.getState().data.weight).toBe(draft.weight)
        expect(useSendRequestStore.getState().data.additionalInfo).toBe(draft.additionalInfo)
    })

    it("keeps the form mounted with values preserved when the server rejects the submit with a 400 validation error", async () => {
        const draft = seedDraft()
        seedSendRequestStore(draft, 3)
        const submit = installSubmitInterceptor(() =>
            HttpResponse.json(
                {
                    success: false,
                    code: "VALIDATION_ERROR",
                    message: "Weight must be greater than zero",
                    field: "weight",
                },
                { status: 400 }
            )
        )

        const { user } = renderSendRequestForm({ initialStep: 4 })

        const submitButton = await screen.findByRole("button", { name: /submit/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(submit.calls).toHaveLength(1)
        })

        await waitFor(() => {
            const reEnabledSubmit = screen.getByRole("button", { name: /submit/i })
            expect(reEnabledSubmit).not.toBeDisabled()
        })

        expect(screen.queryByText(/submitted successfully/i)).not.toBeInTheDocument()

        const finalState = useSendRequestStore.getState()
        expect(finalState.data.firstName).toBe(draft.firstName)
        expect(finalState.data.lastName).toBe(draft.lastName)
        expect(finalState.data.email).toBe(draft.email)
        expect(finalState.data.weight).toBe(draft.weight)
        expect(finalState.data.selectedCategories).toEqual(draft.selectedCategories)
        expect(finalState.data.selectedServices).toEqual(draft.selectedServices)
    })
})
