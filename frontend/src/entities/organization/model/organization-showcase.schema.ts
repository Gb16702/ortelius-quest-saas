import * as v from "valibot"
import { nullableHttpUrlSchema } from "@/shared/lib/validation/url.schema"
import {
    normalizeOrganizationBrandColor,
    type OrganizationBrandColor,
} from "./organization-brand-color"
import { normalizeOrganizationFont, type OrganizationFontId } from "./organization-font"

const nullableStringSchema = v.nullable(v.string())
const optionalNullableStringSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => value ?? null)
)

export const organizationShowcaseOrganizationSchema = v.pipe(
    v.object({
        id: v.string(),
        name: v.string(),
        slug: v.string(),
        logo: nullableHttpUrlSchema,
        tagline: nullableStringSchema,
        overview: nullableStringSchema,
        website: nullableHttpUrlSchema,
        brandColor: v.optional(v.unknown()),
        font: v.optional(v.unknown()),
        createdAt: v.string(),
        memberCount: v.number(),
    }),
    v.transform((organization) => ({
        ...organization,
        logo: organization.logo ?? null,
        tagline: organization.tagline ?? null,
        overview: organization.overview ?? null,
        website: organization.website ?? null,
        brandColor: normalizeOrganizationBrandColor(organization.brandColor),
        font: normalizeOrganizationFont(organization.font),
    }))
)

export const organizationShowcaseServiceSchema = v.object({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    type: v.string(),
})

export const organizationShowcaseCargoTypeSchema = v.object({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
})

export const organizationShowcaseDataSchema = v.object({
    organization: organizationShowcaseOrganizationSchema,
    services: v.array(organizationShowcaseServiceSchema),
    cargoTypes: v.array(organizationShowcaseCargoTypeSchema),
})

export const organizationShowcaseResponseSchema = v.object({
    success: v.boolean(),
    data: v.optional(organizationShowcaseDataSchema),
})

const organizationLayoutShowcaseOrganizationSchema = v.pipe(
    v.object({
        id: v.string(),
        name: v.string(),
        slug: v.optional(v.string()),
        logo: v.optional(nullableHttpUrlSchema),
        brandColor: v.optional(v.unknown()),
        font: v.optional(v.unknown()),
        tagline: optionalNullableStringSchema,
    }),
    v.transform((organization) => ({
        ...organization,
        logo: organization.logo ?? null,
        tagline: organization.tagline ?? null,
        brandColor: normalizeOrganizationBrandColor(organization.brandColor),
        font: normalizeOrganizationFont(organization.font),
    }))
)

export const organizationLayoutShowcaseResponseSchema = v.object({
    success: v.boolean(),
    data: v.optional(
        v.object({
            organization: organizationLayoutShowcaseOrganizationSchema,
        })
    ),
})

export const organizationOgShowcaseResponseSchema = v.object({
    success: v.boolean(),
    data: v.optional(
        v.object({
            organization: v.pipe(
                v.object({
                    name: v.string(),
                    brandColor: v.optional(v.unknown()),
                    font: v.optional(v.unknown()),
                }),
                v.transform((organization) => ({
                    ...organization,
                    brandColor: normalizeOrganizationBrandColor(organization.brandColor),
                }))
            ),
        })
    ),
})

export interface OrganizationLayoutInfo {
    id: string
    name: string
    slug: string
    logo: string | null
    brandColor: OrganizationBrandColor
    font: OrganizationFontId
    tagline: string | null
    memberCount?: number | null
}

function formatSchemaIssues(issues: v.BaseIssue<unknown>[]): string {
    return issues
        .map((issue) => {
            const path =
                issue.path
                    ?.flatMap((item) =>
                        typeof item.key === "string" || typeof item.key === "number"
                            ? [item.key]
                            : []
                    )
                    .join(".") || "<root>"
            return `${path}: ${issue.message}`
        })
        .join("; ")
}

export function parseOrganizationLayoutShowcaseResponse(
    slug: string,
    payload: unknown
): OrganizationLayoutInfo {
    const result = v.safeParse(organizationLayoutShowcaseResponseSchema, payload)
    if (!result.success) {
        throw new Error(
            `Invalid organization layout showcase response for "${slug}": ${formatSchemaIssues(result.issues)}`
        )
    }

    const organization = result.output.success ? result.output.data?.organization : null
    if (!organization) {
        throw new Error(
            `Invalid organization layout showcase response for "${slug}": success response did not include layout organization data`
        )
    }

    return {
        id: organization.id,
        name: organization.name,
        slug: organization.slug ?? slug,
        logo: organization.logo ?? null,
        brandColor: organization.brandColor,
        font: organization.font,
        tagline: organization.tagline ?? null,
        memberCount: null,
    }
}
