import { afterAll, describe, expect, it, mock } from "bun:test"
import { screen, waitFor, within } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { useState } from "react"
import * as v from "valibot"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { server } from "@/shared/test/msw/msw-server"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import type { PreviewChangeDowngrade, PreviewChangeUpgrade } from "../../model/subscription"

const changePlanRequestSchema = v.object({
    priceId: v.string(),
})

const publicEnvDefaults = {
    VITE_API_URL: "https://api.example.test",
    VITE_PORTAL_ACCOUNT_URL: "https://portal.example.test",
    VITE_WS_URL: "wss://ws.example.test",
    VITE_STRIPE_PUBLISHABLE_KEY: "",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(publicEnvDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(publicEnvDefaults)) {
    process.env[key] = value
}

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

mock.module("@stripe/stripe-js", () => ({
    loadStripe: () => Promise.resolve(null),
}))

const { PlanChangeConfirmation } = await import("../plan-change-confirmation")

const TEST_ORG_ID = "org-test"
const TEST_PRICE_ID = "price_test_enterprise_monthly"

function buildUpgradePreview(overrides: Partial<PreviewChangeUpgrade> = {}): PreviewChangeUpgrade {
    return {
        direction: "upgrade",
        newPlan: "enterprise",
        newPlanKey: "enterprise",
        newPrice: 49,
        billingInterval: "monthly",
        currentPlan: "professional",
        currentPlanKey: "professional",
        nextBillingDate: "2026-07-15T00:00:00.000Z",
        currency: "EUR",
        proratedNewCharge: 30,
        adjustment: -10,
        totalDueToday: 20,
        paymentMethod: {
            type: "card",
            brand: "visa",
            last4: "4242",
            expMonth: 12,
            expYear: 2030,
        },
        ...overrides,
    }
}

interface Deferred<T> {
    promise: Promise<T>
    resolve: (value: T) => void
}

function createDeferred<T>(): Deferred<T> {
    let resolve!: (value: T) => void
    const promise = new Promise<T>((res) => {
        resolve = res
    })
    return { promise, resolve }
}

function buildDowngradePreview(
    overrides: Partial<PreviewChangeDowngrade> = {}
): PreviewChangeDowngrade {
    return {
        direction: "downgrade",
        newPlan: "starter",
        newPlanKey: "starter",
        newPrice: 9,
        billingInterval: "monthly",
        currentPlan: "professional",
        currentPlanKey: "professional",
        nextBillingDate: "2026-07-15T00:00:00.000Z",
        currency: "EUR",
        ...overrides,
    }
}

interface HarnessProps {
    direction: "upgrade" | "downgrade"
    onSuccess?: () => void
}

function Harness({ direction, onSuccess = () => {} }: HarnessProps) {
    const [open, setOpen] = useState(true)
    return (
        <PlanChangeConfirmation
            open={open}
            onOpenChange={setOpen}
            priceId={TEST_PRICE_ID}
            direction={direction}
            organizationId={TEST_ORG_ID}
            onSuccess={onSuccess}
        />
    )
}

function buildPlansResponse() {
    return {
        plans: [
            buildPlan("starter", "Starter", [
                { key: "unlimitedRequests", label: "Unlimited requests", included: true },
                { key: "teamChat", label: "Team chat", included: false },
            ]),
            buildPlan("professional", "Professional", [
                { key: "unlimitedRequests", label: "Unlimited requests", included: true },
                { key: "teamChat", label: "Team chat", included: true },
            ]),
            buildPlan("enterprise", "Enterprise", [
                { key: "unlimitedRequests", label: "Unlimited requests", included: true },
                { key: "teamChat", label: "Team chat", included: true },
            ]),
        ],
    }
}

function buildPlan(
    name: "starter" | "professional" | "enterprise",
    displayName: string,
    features: Array<{ key: string; label: string; included: boolean }>
) {
    return {
        name,
        displayName,
        tagline: `${displayName} test plan`,
        priceIds: {
            monthly: `price_test_${name}_monthly`,
            annual: `price_test_${name}_annual`,
        },
        prices: {
            monthly: { amount: 19, currency: "EUR" },
            annual: { amount: 190, currency: "EUR" },
        },
        features,
        freeTrial: { days: 14 },
    }
}

describe("PlanChangeConfirmation", () => {
    setupMswServer(http.get("/api/onboarding/plans", () => HttpResponse.json(buildPlansResponse())))

    it("shows prorated upgrade amounts and the next billing copy after preview loads", async () => {
        server.use(
            http.post("/api/subscription/preview-change", () =>
                HttpResponse.json(buildUpgradePreview())
            )
        )

        renderWithProviders(<Harness direction="upgrade" />)

        const dialog = await screen.findByRole("dialog")
        const dialogScope = within(dialog)

        await dialogScope.findByText(/Prorated enterprise plan/i)

        expect(dialogScope.getByText("€30.00")).toBeInTheDocument()
        expect(
            dialogScope.getByText(/Prorated credit for unused professional time/i)
        ).toBeInTheDocument()
        expect(dialogScope.getByText("−€10.00")).toBeInTheDocument()
        expect(dialogScope.getByText(/Due today/i)).toBeInTheDocument()
        expect(dialogScope.getByText("€20.00")).toBeInTheDocument()
        expect(dialogScope.getByText(/Then €49\.00 \/ month from/)).toBeInTheDocument()
        expect(dialogScope.getByText(/July 15, 2026/)).toBeInTheDocument()
    })

    it("shows the new plan name, current plan name, and effective date for a downgrade", async () => {
        server.use(
            http.post("/api/subscription/preview-change", () =>
                HttpResponse.json(buildDowngradePreview())
            )
        )

        renderWithProviders(<Harness direction="downgrade" />)

        const dialog = await screen.findByRole("dialog")
        const dialogScope = within(dialog)

        await dialogScope.findByText(/New starter plan/i)

        expect(dialogScope.getByText(/New starter plan/i)).toBeInTheDocument()
        expect(dialogScope.getByText("€9.00 / month")).toBeInTheDocument()
        expect(dialogScope.getByText(/Effective from/i)).toBeInTheDocument()
        expect(dialogScope.getByText(/July 15, 2026/)).toBeInTheDocument()
        expect(
            dialogScope.getByText(
                /Your professional plan stays active until then\. No charge today\./i
            )
        ).toBeInTheDocument()
        await dialogScope.findByText(/Features removed/i)
        expect(dialogScope.getByText("Team chat")).toBeInTheDocument()

        expect(dialogScope.getByRole("button", { name: "Confirm" })).toBeInTheDocument()
    })

    it("keeps the submit button disabled until the preview resolves, then enables it", async () => {
        const previewGate = createDeferred<void>()

        server.use(
            http.post("/api/subscription/preview-change", async () => {
                await previewGate.promise
                return HttpResponse.json(buildUpgradePreview())
            })
        )

        renderWithProviders(<Harness direction="upgrade" />)

        const dialog = await screen.findByRole("dialog")
        const dialogScope = within(dialog)

        await waitFor(() => {
            expect(dialogScope.getByRole("button", { name: "Pay now" })).toBeDisabled()
        })

        previewGate.resolve()

        await waitFor(() => {
            expect(dialogScope.getByRole("button", { name: "Pay now" })).toBeEnabled()
        })
    })

    it("calls onSuccess and triggers the change-plan mutation on submit", async () => {
        const changePlanCalls: Array<{ priceId: string }> = []
        let onSuccessCalls = 0

        server.use(
            http.post("/api/subscription/preview-change", () =>
                HttpResponse.json(buildUpgradePreview())
            ),
            http.post("/api/subscription/change-plan", async ({ request }) => {
                const body = await request.json()
                const parsed = parseSchema(changePlanRequestSchema, body)
                changePlanCalls.push({ priceId: parsed.priceId })
                return HttpResponse.json({
                    success: true,
                    subscriptionId: "sub_test_123",
                    direction: "upgrade",
                    effectiveAt: "2026-07-15T00:00:00.000Z",
                })
            })
        )

        const handleSuccess = () => {
            onSuccessCalls += 1
        }

        const { user } = renderWithProviders(
            <Harness direction="upgrade" onSuccess={handleSuccess} />
        )

        const dialog = await screen.findByRole("dialog")
        const dialogScope = within(dialog)

        const submit = await waitFor(() => {
            const button = dialogScope.getByRole("button", { name: "Pay now" })
            expect(button).toBeEnabled()
            return button
        })

        await user.click(submit)

        await waitFor(() => {
            expect(onSuccessCalls).toBe(1)
        })

        expect(changePlanCalls).toHaveLength(1)
        expect(changePlanCalls[0]?.priceId).toBe(TEST_PRICE_ID)
    })

    it("shows an inline retry message when the preview request returns 402", async () => {
        server.use(
            http.post("/api/subscription/preview-change", () =>
                HttpResponse.json(
                    { message: "Card declined. Update your payment method to continue." },
                    { status: 402 }
                )
            )
        )

        renderWithProviders(<Harness direction="upgrade" />)

        const dialog = await screen.findByRole("dialog")
        const dialogScope = within(dialog)

        await dialogScope.findByText(/We couldn't load the plan change details/i)
        expect(
            dialogScope.getByText(/Card declined\. Update your payment method to continue\./i)
        ).toBeInTheDocument()
        expect(dialogScope.getByRole("button", { name: /Try again/i })).toBeInTheDocument()

        expect(dialogScope.queryByRole("button", { name: "Pay now" })).not.toBeInTheDocument()
        expect(dialogScope.getByRole("button", { name: /Close/i })).toBeInTheDocument()
    })

    it("keeps the dialog open and re-enables the submit button when change-plan returns 402", async () => {
        let onSuccessCalls = 0

        server.use(
            http.post("/api/subscription/preview-change", () =>
                HttpResponse.json(buildUpgradePreview())
            ),
            http.post("/api/subscription/change-plan", () =>
                HttpResponse.json(
                    { message: "Payment required to apply this plan change." },
                    { status: 402 }
                )
            )
        )

        const handleSuccess = () => {
            onSuccessCalls += 1
        }

        const { user } = renderWithProviders(
            <Harness direction="upgrade" onSuccess={handleSuccess} />
        )

        const dialog = await screen.findByRole("dialog")
        const dialogScope = within(dialog)

        const submit = await waitFor(() => {
            const button = dialogScope.getByRole("button", { name: "Pay now" })
            expect(button).toBeEnabled()
            return button
        })

        await user.click(submit)

        await waitFor(() => {
            expect(dialogScope.getByRole("button", { name: "Pay now" })).toBeEnabled()
        })

        expect(onSuccessCalls).toBe(0)
        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(screen.getByRole("heading", { name: /Confirm plan changes/i })).toBeInTheDocument()
    })
})
