import { describe, expect, it } from "bun:test"
import { publicMarketingPlans } from "@/entities/subscription"
import { getVisibleDeltaFeatures } from "../plan-selection"

describe("getVisibleDeltaFeatures", () => {
    it("uses the pricing card highlights for the current plan only", () => {
        const professional = publicMarketingPlans.find((plan) => plan.name === "professional")
        if (!professional) throw new Error("Professional plan fixture is required")

        const featureKeys = getVisibleDeltaFeatures(professional).map((feature) => feature.key)

        expect(featureKeys).toEqual([
            "teamChat",
            "voipCalls",
            "callTranscription",
            "activityLog",
            "basicDashboard",
            "colorThemes",
        ])
        expect(featureKeys).not.toContain("unlimitedRequests")
        expect(featureKeys).not.toContain("advancedAnalytics")
        expect(featureKeys).not.toContain("pricingIntelligence")
    })
})
