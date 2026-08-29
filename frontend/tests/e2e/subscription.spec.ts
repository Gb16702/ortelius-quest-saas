import type { Page, Route } from "@playwright/test"
import { expect, test } from "./fixtures/auth.fixture"
import { E2E_ORG_SLUG } from "./helpers/e2e-app"

type PlanKey = "starter" | "professional" | "enterprise"

interface SubscriptionMockState {
    currentPlan: PlanKey
    previewMode: "normal" | "invalid-billing"
    changeMode: "normal" | "payment-required"
}

const NEXT_BILLING_DATE = "2026-06-15T00:00:00.000Z"

const PLAN_PRICES: Record<PlanKey, number> = {
    starter: 9,
    professional: 19,
    enterprise: 49,
}

const PLAN_PRICE_IDS: Record<PlanKey, string> = {
    starter: "price_e2e_starter_monthly",
    professional: "price_e2e_professional_monthly",
    enterprise: "price_e2e_enterprise_monthly",
}

const PLAN_DISPLAY_NAMES: Record<PlanKey, string> = {
    starter: "Starter",
    professional: "Professional",
    enterprise: "Enterprise",
}

const PLAN_FEATURES = [
    { key: "unlimitedRequests", label: "Unlimited requests", tiers: ["starter"] },
    { key: "quoteManagement", label: "Quote management", tiers: ["starter"] },
    { key: "clientChat", label: "Client chat", tiers: ["starter"] },
    { key: "branding", label: "Branding", tiers: ["starter"] },
    { key: "teamChat", label: "Team chat", tiers: ["professional"] },
    { key: "voipCalls", label: "VoIP calls", tiers: ["professional"] },
    { key: "callTranscription", label: "Call transcription", tiers: ["professional"] },
    { key: "activityLog", label: "Activity log", tiers: ["professional"] },
    { key: "basicDashboard", label: "Basic dashboard", tiers: ["professional"] },
    { key: "colorThemes", label: "Color themes", tiers: ["professional"] },
    { key: "advancedAnalytics", label: "Advanced analytics", tiers: ["enterprise"] },
    { key: "pricingIntelligence", label: "Pricing intelligence", tiers: ["enterprise"] },
] as const

const PLAN_ORDER: PlanKey[] = ["starter", "professional", "enterprise"]

test.describe("subscription plan changes @critical", () => {
    test("upgrades, downgrades with feature loss, and keeps failed payment changes recoverable", async ({
        adminPage,
    }) => {
        const state: SubscriptionMockState = {
            currentPlan: "professional",
            previewMode: "normal",
            changeMode: "normal",
        }
        await mockSubscriptionRoutes(adminPage, state)

        await adminPage.goto(`/org/${E2E_ORG_SLUG}/settings/billing`)
        await expect(adminPage.getByRole("heading", { name: "Billing" })).toBeVisible()
        await expect(adminPage.getByRole("heading", { name: "Professional" })).toBeVisible()

        await adminPage.getByRole("button", { name: "Manage" }).click()
        await expect(adminPage.getByRole("dialog", { name: "Manage your plan" })).toBeVisible()
        await adminPage.getByRole("button", { name: "Upgrade to Enterprise" }).click()
        await expect(adminPage.getByRole("dialog", { name: "Confirm plan changes" })).toBeVisible()
        await expect(adminPage.getByText("Prorated Enterprise plan")).toBeVisible()
        await expect(adminPage.getByText("Due today")).toBeVisible()
        await adminPage.getByRole("button", { name: "Pay now" }).click()
        await expect(adminPage.getByRole("heading", { name: "Enterprise" })).toBeVisible()

        await adminPage.getByRole("button", { name: "Manage" }).click()
        await adminPage.getByRole("button", { name: "Downgrade to Starter" }).click()
        const confirmDialog = adminPage.getByRole("dialog", { name: "Confirm plan changes" })
        await expect(confirmDialog.getByText("New Starter plan")).toBeVisible()
        await expect(confirmDialog.getByText("Features removed")).toBeVisible()
        await expect(confirmDialog.getByText("Team chat")).toBeVisible()
        await expect(confirmDialog.getByText("No charge today.")).toBeVisible()
        await adminPage.getByRole("button", { name: "Confirm" }).click()
        await expect(adminPage.getByRole("heading", { name: "Starter" })).toBeVisible()

        state.previewMode = "invalid-billing"
        await adminPage.getByRole("button", { name: "Manage" }).click()
        await adminPage.getByRole("button", { name: "Upgrade to Enterprise" }).click()
        await expect(adminPage.getByText("Billing address is incomplete.")).toBeVisible()
        await adminPage
            .getByRole("dialog", { name: "Confirm plan changes" })
            .getByRole("button", { name: "Close" })
            .click()

        state.previewMode = "normal"
        state.changeMode = "payment-required"
        await adminPage.getByRole("button", { name: "Upgrade to Enterprise" }).click()
        await expect(adminPage.getByText("Prorated Enterprise plan")).toBeVisible()
        await adminPage.getByRole("button", { name: "Pay now" }).click()

        await expect(adminPage.getByText("Payment confirmation required.")).toBeVisible()
        await expect(adminPage.getByRole("dialog", { name: "Confirm plan changes" })).toBeVisible()
        await expect(adminPage.getByRole("button", { name: "Pay now" })).toBeEnabled()
    })
})

async function mockSubscriptionRoutes(page: Page, state: SubscriptionMockState) {
    await page.route("**/api/onboarding/plans", (route) =>
        fulfillJson(route, { plans: buildPlans() })
    )

    await page.route("**/api/subscription/current", (route) =>
        fulfillJson(route, buildCurrentSubscription(state.currentPlan))
    )

    await page.route("**/api/subscription/payment-method", (route) =>
        fulfillJson(route, {
            paymentMethod: {
                type: "card",
                brand: "visa",
                last4: "4242",
                expMonth: 12,
                expYear: 2030,
            },
        })
    )

    await page.route("**/api/subscription/billing-address", (route) =>
        fulfillJson(route, {
            address: {
                country: "BE",
                line1: "1 E2E Street",
                line2: null,
                city: "Brussels",
                postalCode: "1000",
                state: null,
            },
        })
    )

    await page.route("**/api/subscription/invoice-email", (route) =>
        fulfillJson(route, { email: "billing@example.test" })
    )

    await page.route("**/api/subscription/invoice-language", (route) =>
        fulfillJson(route, { language: "en" })
    )

    await page.route("**/api/subscription/preview-change", async (route) => {
        if (state.previewMode === "invalid-billing") {
            await fulfillJson(route, { message: "Billing address is incomplete." }, 400)
            return
        }

        const targetPlan = getTargetPlan(await route.request().postDataJSON())
        await fulfillJson(route, buildPreview(state.currentPlan, targetPlan))
    })

    await page.route("**/api/subscription/change-plan", async (route) => {
        if (state.changeMode === "payment-required") {
            await fulfillJson(route, { message: "Payment confirmation required." }, 402)
            return
        }

        const targetPlan = getTargetPlan(await route.request().postDataJSON())
        const direction = getDirection(state.currentPlan, targetPlan)
        state.currentPlan = targetPlan
        await fulfillJson(route, {
            success: true,
            subscriptionId: "sub_e2e",
            direction,
            effectiveAt: NEXT_BILLING_DATE,
        })
    })
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
    await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
    })
}

function buildPlans() {
    return PLAN_ORDER.map((plan, index) => {
        const includedTiers = new Set(PLAN_ORDER.slice(0, index + 1))
        return {
            name: plan,
            displayName: PLAN_DISPLAY_NAMES[plan],
            tagline: `${PLAN_DISPLAY_NAMES[plan]} plan for E2E billing flows.`,
            priceIds: {
                monthly: PLAN_PRICE_IDS[plan],
                annual: `${PLAN_PRICE_IDS[plan]}_annual`,
            },
            prices: {
                monthly: { amount: PLAN_PRICES[plan], currency: "EUR" },
                annual: { amount: PLAN_PRICES[plan] * 12, currency: "EUR" },
            },
            features: PLAN_FEATURES.map((feature) => ({
                key: feature.key,
                label: feature.label,
                included: feature.tiers.some((tier) => includedTiers.has(tier as PlanKey)),
            })),
            freeTrial: { days: 14 },
        }
    })
}

function buildCurrentSubscription(plan: PlanKey) {
    return {
        plan,
        status: "active",
        pricePerSeat: PLAN_PRICES[plan],
        totalMonthlyPrice: PLAN_PRICES[plan] * 2,
        currentPriceId: PLAN_PRICE_IDS[plan],
        nextBillingDate: NEXT_BILLING_DATE,
        cancelAtPeriodEnd: false,
        cancelsAt: null,
        pendingPlanChange: null,
        trialEnd: null,
        hasUsedTrial: true,
        hasActiveSubscription: true,
    }
}

function buildPreview(currentPlan: PlanKey, targetPlan: PlanKey) {
    const direction = getDirection(currentPlan, targetPlan)
    const base = {
        direction,
        newPlan: PLAN_DISPLAY_NAMES[targetPlan],
        newPlanKey: targetPlan,
        newPrice: PLAN_PRICES[targetPlan],
        billingInterval: "monthly",
        currentPlan: PLAN_DISPLAY_NAMES[currentPlan],
        currentPlanKey: currentPlan,
        nextBillingDate: NEXT_BILLING_DATE,
        currency: "EUR",
    } as const

    if (direction === "downgrade") return base

    return {
        ...base,
        proratedNewCharge: 37.5,
        adjustment: -12.5,
        totalDueToday: 25,
        paymentMethod: {
            type: "card",
            brand: "visa",
            last4: "4242",
            expMonth: 12,
            expYear: 2030,
        },
    }
}

function getTargetPlan(payload: unknown): PlanKey {
    if (!payload || typeof payload !== "object" || !("priceId" in payload)) {
        throw new Error("Missing priceId")
    }

    const priceId = String(payload.priceId)
    const target = PLAN_ORDER.find(
        (plan) => PLAN_PRICE_IDS[plan] === priceId || `${PLAN_PRICE_IDS[plan]}_annual` === priceId
    )

    if (!target) throw new Error(`Unknown priceId ${priceId}`)
    return target
}

function getDirection(currentPlan: PlanKey, targetPlan: PlanKey): "upgrade" | "downgrade" {
    return PLAN_ORDER.indexOf(targetPlan) > PLAN_ORDER.indexOf(currentPlan)
        ? "upgrade"
        : "downgrade"
}
