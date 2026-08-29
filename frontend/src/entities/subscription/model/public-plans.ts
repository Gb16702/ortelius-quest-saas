import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import {
    type Plan,
    type PlanFeature,
    type PlanKey,
    type PlansResponse,
    plansResponseSchema,
} from "./subscription.schema"

const planOrder: PlanKey[] = ["starter", "professional", "enterprise"]

const planRank: Record<PlanKey, number> = {
    starter: 0,
    professional: 1,
    enterprise: 2,
}

interface PublicPlanFeature {
    key: string
    label: string
    minimumPlan: PlanKey
}

const publicPlanFeatures: PublicPlanFeature[] = [
    { key: "unlimitedRequests", label: "Unlimited requests", minimumPlan: "starter" },
    { key: "quoteManagement", label: "Quote management", minimumPlan: "starter" },
    { key: "invoiceGeneration", label: "Invoice generation", minimumPlan: "starter" },
    { key: "clientChat", label: "Chat with clients", minimumPlan: "starter" },
    { key: "teamChat", label: "Team chat", minimumPlan: "professional" },
    { key: "voipCalls", label: "Voice calls", minimumPlan: "professional" },
    { key: "callTranscription", label: "Call transcription", minimumPlan: "professional" },
    { key: "colorThemes", label: "Theme presets", minimumPlan: "professional" },
    { key: "basicDashboard", label: "Analytics dashboard", minimumPlan: "professional" },
    { key: "advancedAnalytics", label: "Advanced analytics & reports", minimumPlan: "enterprise" },
    { key: "memberPerformance", label: "Member performance tracking", minimumPlan: "enterprise" },
    { key: "documentUpload", label: "Document upload", minimumPlan: "starter" },
    { key: "bulkOperations", label: "Bulk operations", minimumPlan: "starter" },
    { key: "dataExports", label: "Data exports", minimumPlan: "starter" },
    { key: "requestManagement", label: "Request management", minimumPlan: "starter" },
    { key: "showcasePage", label: "Showcase page", minimumPlan: "starter" },
    { key: "graphqlMetrics", label: "GraphQL metrics", minimumPlan: "enterprise" },
    { key: "branding", label: "Custom branding", minimumPlan: "starter" },
    { key: "subdomain", label: "Custom subdomain", minimumPlan: "starter" },
    { key: "csvExport", label: "CSV exports", minimumPlan: "starter" },
    { key: "pdfExport", label: "PDF exports", minimumPlan: "starter" },
    { key: "activityLog", label: "Activity log", minimumPlan: "professional" },
    { key: "pricingIntelligence", label: "Pricing intelligence", minimumPlan: "enterprise" },
]

function buildPlanFeatures(plan: PlanKey): PlanFeature[] {
    return publicPlanFeatures.map((feature) => ({
        key: feature.key,
        label: feature.label,
        included: planRank[plan] >= planRank[feature.minimumPlan],
    }))
}

const publicPlansData = {
    plans: [
        {
            name: "starter",
            displayName: "Starter",
            tagline: "For small teams getting started",
            priceIds: {
                monthly: "price_1TQlUvLqXMsEBXlWkjCPK2fV",
                annual: "price_1TQlVCLqXMsEBXlWCPgIlcDu",
            },
            prices: {
                monthly: { amount: 25, currency: "EUR" },
                annual: { amount: 250, currency: "EUR" },
            },
            features: buildPlanFeatures("starter"),
            freeTrial: { days: 14 },
        },
        {
            name: "professional",
            displayName: "Professional",
            tagline: "For growing teams that need more",
            priceIds: {
                monthly: "price_1SeXiaLqXMsEBXlWAwHp0Dc8",
                annual: "price_1SZsQLLqXMsEBXlWiyGOd70G",
            },
            prices: {
                monthly: { amount: 75, currency: "EUR" },
                annual: { amount: 750, currency: "EUR" },
            },
            features: buildPlanFeatures("professional"),
            freeTrial: { days: 14 },
        },
        {
            name: "enterprise",
            displayName: "Enterprise",
            tagline: "For organizations with advanced needs",
            priceIds: {
                monthly: "price_1SeXfSLqXMsEBXlWWvCzI7rA",
                annual: "price_1SeXfSLqXMsEBXlWvpZYWLo6",
            },
            prices: {
                monthly: { amount: 150, currency: "EUR" },
                annual: { amount: 1500, currency: "EUR" },
            },
            features: buildPlanFeatures("enterprise"),
            freeTrial: { days: 14 },
        },
    ],
} satisfies PlansResponse

export const publicMarketingPlans = parseSchema(plansResponseSchema, publicPlansData).plans
export const publicMarketingPlanOrder = planOrder satisfies readonly Plan["name"][]
