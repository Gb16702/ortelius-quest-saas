import * as v from "valibot"

export const organizationSetupStatusSchema = v.object({
    hasLogo: v.boolean(),
    hasTagline: v.boolean(),
    hasOverview: v.boolean(),
    hasServices: v.boolean(),
    hasCargoTypes: v.boolean(),
    hasVatConfig: v.boolean(),
    hasLegalDocuments: v.boolean(),
    memberCount: v.number(),
    isComplete: v.boolean(),
})

export const organizationSetupStatusResponseSchema = v.looseObject({
    success: v.literal(true),
    data: organizationSetupStatusSchema,
    message: v.optional(v.string()),
})

export type OrganizationSetupStatus = v.InferOutput<typeof organizationSetupStatusSchema>

export interface SetupStep {
    id: string
    title: string
    description: string
    isComplete: boolean
    href: string
    isVisible: boolean
}

export function getSetupSteps(status: OrganizationSetupStatus, slug: string): SetupStep[] {
    const steps: SetupStep[] = [
        {
            id: "logo",
            title: "Add organization logo",
            description: "Upload a logo to make your organization recognizable",
            isComplete: status.hasLogo,
            href: `/org/${slug}/settings#logo`,
            isVisible: true,
        },
        {
            id: "tagline",
            title: "Add a tagline",
            description: "A short phrase that describes what your organization does",
            isComplete: status.hasTagline,
            href: `/org/${slug}/settings#tagline`,
            isVisible: true,
        },
        {
            id: "overview",
            title: "Write an overview",
            description: "A detailed description of your organization. Supports Markdown.",
            isComplete: status.hasOverview,
            href: `/org/${slug}/settings#overview`,
            isVisible: true,
        },
        {
            id: "services",
            title: "Configure services",
            description: "Select the services your organization offers",
            isComplete: status.hasServices,
            href: `/org/${slug}/settings/business#business`,
            isVisible: true,
        },
        {
            id: "cargoTypes",
            title: "Configure cargo types",
            description: "Select the cargo types you can handle",
            isComplete: status.hasCargoTypes,
            href: `/org/${slug}/settings/business#business`,
            isVisible: true,
        },
        {
            id: "vat",
            title: "Set up VAT configuration",
            description: "Configure your tax identification for invoicing",
            isComplete: status.hasVatConfig,
            href: `/org/${slug}/settings/billing#vat`,
            isVisible: true,
        },
        {
            id: "legalDocuments",
            title: "Upload legal documents",
            description: "Required to send quotes — terms, conditions, or other PDFs",
            isComplete: status.hasLegalDocuments,
            href: `/org/${slug}/settings/legals`,
            isVisible: true,
        },
        {
            id: "invite",
            title: "Invite team members",
            description: "Grow your team by inviting colleagues",
            isComplete: false,
            href: `/org/${slug}/team`,
            isVisible: status.memberCount === 1,
        },
    ]

    return steps.filter((step) => step.isVisible)
}

export interface CompletionCount {
    completed: number
    total: number
}

export function getCompletionCount(status: OrganizationSetupStatus): CompletionCount {
    const completed = countCompletedSteps(status)
    const total = countTotalSteps(status)
    return { completed, total }
}

export function resolveOrganizationSetupCompletion(status: OrganizationSetupStatus): boolean {
    return (
        status.hasLogo &&
        status.hasTagline &&
        status.hasOverview &&
        status.hasServices &&
        status.hasCargoTypes &&
        status.hasVatConfig &&
        status.hasLegalDocuments
    )
}

function countCompletedSteps(status: OrganizationSetupStatus): number {
    let completed = 0
    if (status.hasLogo) completed++
    if (status.hasTagline) completed++
    if (status.hasOverview) completed++
    if (status.hasServices) completed++
    if (status.hasCargoTypes) completed++
    if (status.hasVatConfig) completed++
    if (status.hasLegalDocuments) completed++
    return completed
}

function countTotalSteps(status: OrganizationSetupStatus): number {
    let total = 7
    if (status.memberCount === 1) total++
    return total
}

export function isOrganizationFullySetUp(status: OrganizationSetupStatus): boolean {
    return status.isComplete && status.hasLegalDocuments
}
