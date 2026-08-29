import * as v from "valibot"
import { organizationSlugSchema } from "./organization-slug"
import { isValidHttpsWebsite } from "./organization-website"
import { TAX_ID_PATTERNS } from "./tax-id-data"

export const ORGANIZATION_NAME_MIN_LENGTH = 2
export const ORGANIZATION_NAME_MAX_LENGTH = 32

export const organizationNameSchema = v.object({
    name: v.pipe(
        v.string(),
        v.trim(),
        v.minLength(
            ORGANIZATION_NAME_MIN_LENGTH,
            `Name must be at least ${ORGANIZATION_NAME_MIN_LENGTH} characters`
        ),
        v.maxLength(
            ORGANIZATION_NAME_MAX_LENGTH,
            `Name must be at most ${ORGANIZATION_NAME_MAX_LENGTH} characters`
        )
    ),
})

export const organizationWorkspaceUrlSchema = v.object({
    slug: organizationSlugSchema,
})

export const taglineSchema = v.object({
    tagline: v.pipe(v.string(), v.maxLength(80, "Tagline must be 80 characters or less")),
})

export const overviewSchema = v.object({
    overview: v.pipe(v.string(), v.maxLength(2000, "Overview must be 2,000 characters or less")),
})

export const websiteSchema = v.object({
    website: v.pipe(
        v.string(),
        v.maxLength(255, "URL must be 255 characters or less"),
        v.check(isValidHttpsWebsite, "Please enter a valid HTTPS URL")
    ),
})

export const taxIdSchema = v.pipe(
    v.object({
        taxIdType: v.pipe(v.string(), v.minLength(1, "Please select a tax ID type")),
        taxIdNumber: v.pipe(v.string(), v.minLength(1, "Please enter your tax ID number")),
    }),
    v.check((data) => {
        if (!data.taxIdType || !data.taxIdNumber) return true
        const pattern = TAX_ID_PATTERNS[data.taxIdType]
        if (!pattern) return true
        return pattern.test(data.taxIdNumber)
    }, "Invalid tax ID format")
)

export type TaglineFormData = v.InferOutput<typeof taglineSchema>
export type OverviewFormData = v.InferOutput<typeof overviewSchema>
export type WebsiteFormData = v.InferOutput<typeof websiteSchema>
export type TaxIdFormData = v.InferOutput<typeof taxIdSchema>
export type OrganizationNameFormData = v.InferOutput<typeof organizationNameSchema>
export type OrganizationWorkspaceUrlFormData = v.InferOutput<typeof organizationWorkspaceUrlSchema>
