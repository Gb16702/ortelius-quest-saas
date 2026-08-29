import * as v from "valibot"
import { normalizeOrganizationBrandColor } from "./organization-brand-color"
import { normalizeOrganizationFont } from "./organization-font"

const nullableStringSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => value ?? null)
)

const organizationInfoDataBaseSchema = v.object({
    name: v.pipe(
        v.optional(v.nullable(v.string())),
        v.transform((value) => value || "Organization")
    ),
    slug: nullableStringSchema,
    logo: nullableStringSchema,
    tagline: nullableStringSchema,
    overview: nullableStringSchema,
    website: nullableStringSchema,
    taxIdType: nullableStringSchema,
    taxIdNumber: nullableStringSchema,
    emailIntakeEnabled: v.pipe(
        v.optional(v.nullable(v.boolean())),
        v.transform((value) => value ?? false)
    ),
    brandColor: v.optional(v.unknown()),
    font: v.optional(v.unknown()),
})

const organizationInfoDataSchema = v.pipe(
    organizationInfoDataBaseSchema,
    v.transform((data) => ({
        ...data,
        brandColor: normalizeOrganizationBrandColor(data.brandColor),
        font: normalizeOrganizationFont(data.font),
    }))
)

export const organizationInfoSchema = v.pipe(
    v.object({
        .../*@valibot-migrate we can't detect if organizationInfoDataBaseSchema has a `pipe` operator, if it does you might need to migrate this by hand otherwise it will loose it's pipeline*/
        organizationInfoDataBaseSchema.entries,

        id: v.string(),
    }),
    v.transform((data) => ({
        ...data,
        brandColor: normalizeOrganizationBrandColor(data.brandColor),
        font: normalizeOrganizationFont(data.font),
    }))
)

const organizationInfoResponseSchema = v.looseObject({
    success: v.literal(true),
    data: organizationInfoDataSchema,
})

const organizationInfoErrorResponseSchema = v.looseObject({
    message: v.optional(v.string()),
})

export function parseOrganizationInfoResponse(organizationId: string, payload: unknown) {
    const result = v.safeParse(organizationInfoResponseSchema, payload)
    if (result.success) {
        return v.parse(organizationInfoSchema, {
            id: organizationId,
            ...result.output.data,
        })
    }

    const errorResult = v.safeParse(organizationInfoErrorResponseSchema, payload)
    if (errorResult.success) {
        throw new Error(errorResult.output.message || "Failed to fetch organization info")
    }

    throw new Error("Failed to fetch organization info")
}

export type OrganizationInfo = v.InferOutput<typeof organizationInfoSchema>
