import * as v from "valibot"

export const ORGANIZATION_SLUG_MIN_LENGTH = 3
export const ORGANIZATION_SLUG_MAX_LENGTH = 50

const ORGANIZATION_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function slugifyOrganizationName(value: string): string {
    return value
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .replace(/-{2,}/g, "-")
        .slice(0, ORGANIZATION_SLUG_MAX_LENGTH)
        .replace(/-+$/g, "")
}

export function normalizeOrganizationSlugInput(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, "")
        .replace(/-{2,}/g, "-")
        .replace(/^-+/, "")
        .slice(0, ORGANIZATION_SLUG_MAX_LENGTH)
}

export const organizationSlugSchema = v.pipe(
    v.string(),
    v.trim(),
    v.minLength(
        ORGANIZATION_SLUG_MIN_LENGTH,
        `Organization URL must be at least ${ORGANIZATION_SLUG_MIN_LENGTH} characters`
    ),
    v.maxLength(
        ORGANIZATION_SLUG_MAX_LENGTH,
        `Organization URL must be at most ${ORGANIZATION_SLUG_MAX_LENGTH} characters`
    ),
    v.regex(ORGANIZATION_SLUG_PATTERN, "Use lowercase letters, numbers, and single hyphens only")
)

export type OrganizationSlug = v.InferOutput<typeof organizationSlugSchema>
