import type { FeatureKey } from "./subscription.schema"

export const FEATURE_ICON_NAMES = {
    unlimitedRequests: "infinity",
    quoteManagement: "note",
    clientChat: "chat",
    branding: "branding",
    teamChat: "team-chat",
    voipCalls: "phone",
    callTranscription: "transcript",
    activityLog: "activity-log",
    basicDashboard: "analytics",
    colorThemes: "paint",
    advancedAnalytics: "advanced",
    pricingIntelligence: "pricing-intelligence",
} as const satisfies Record<FeatureKey, string>
