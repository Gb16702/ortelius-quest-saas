import * as v from "valibot"
import { AssignableRoleSchema } from "@/entities/access/@x/session"

const nullableStringSchema = v.pipe(
    v.optional(v.nullable(v.string())),
    v.transform((value) => value ?? null)
)

const userProfileSchema = v.looseObject({
    language: v.optional(v.nullable(v.string())),
})

export const userSchema = v.looseObject({
    id: v.string(),
    name: v.optional(v.string(), ""),
    email: v.optional(v.string(), ""),
    emailVerified: v.optional(v.boolean(), false),
    image: nullableStringSchema,
    createdAt: v.optional(v.string(), ""),
    updatedAt: v.optional(v.string(), ""),
    twoFactorEnabled: v.optional(v.boolean(), false),
    stripeCustomerId: nullableStringSchema,
    role: v.optional(AssignableRoleSchema, "member"),
    dominantColor: nullableStringSchema,
    profile: v.optional(v.nullable(userProfileSchema)),
})

export const authMeResponseSchema = v.looseObject({
    sub: v.string(),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    accessToken: v.optional(v.string()),
})

export const activeOrganizationSchema = v.looseObject({
    id: v.string(),
    name: v.string(),
    slug: nullableStringSchema,
    logo: nullableStringSchema,
    brandLogo: v.optional(nullableStringSchema),
    tagline: v.optional(nullableStringSchema),
    brandColor: v.optional(nullableStringSchema),
})

export const activeOrganizationResponseSchema = v.looseObject({
    organization: v.nullable(activeOrganizationSchema),
})

export type User = v.InferOutput<typeof userSchema>
export type ActiveOrganization = v.InferOutput<typeof activeOrganizationSchema>
