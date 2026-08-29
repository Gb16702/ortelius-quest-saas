import { serverEnv } from "@/shared/config/env.server"
import { safeParseSchema } from "@/shared/lib/validation/valibot-parse"
import type { OrganizationBrandColor } from "../model/organization-brand-color"
import type { OrganizationFontId } from "../model/organization-font"
import type { OrganizationShowcaseData } from "../model/organization-showcase"
import {
    organizationOgShowcaseResponseSchema,
    organizationShowcaseResponseSchema,
    parseOrganizationLayoutShowcaseResponse,
} from "../model/organization-showcase.schema"

export class OrganizationShowcaseContractError extends Error {
    constructor(message: string) {
        super(message)
        this.name = "OrganizationShowcaseContractError"
    }
}

export interface OrganizationLayoutShowcase {
    id: string
    name: string
    logo: string | null
    brandColor: OrganizationBrandColor
    font: OrganizationFontId
    tagline: string | null
}

export interface OrganizationOgShowcase {
    name: string
    brandColor: OrganizationBrandColor
}

function fetchOrganizationShowcaseResponse(slug: string): Promise<Response> {
    return fetch(`${serverEnv.API_URL}/api/organizations/${slug}/showcase`, {
        headers: { "Content-Type": "application/json" },
    })
}

function formatSchemaIssues(issues: Array<{ path: PropertyKey[]; message: string }>): string {
    return issues.map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`).join("; ")
}

function throwContractError(slug: string, reason: string): never {
    throw new OrganizationShowcaseContractError(
        `Invalid organization showcase response for "${slug}": ${reason}`
    )
}

function handleShowcaseHttpError(response: Response, slug: string): null {
    if (response.status === 404) return null

    throw new OrganizationShowcaseContractError(
        `Failed to load organization showcase for "${slug}": ${response.status} ${response.statusText || "HTTP error"}`
    )
}

export async function fetchOrganizationShowcaseServer(
    slug: string
): Promise<OrganizationShowcaseData | null> {
    const response = await fetchOrganizationShowcaseResponse(slug)
    if (!response.ok) {
        return handleShowcaseHttpError(response, slug)
    }

    const payload: unknown = await response.json()
    const result = safeParseSchema(organizationShowcaseResponseSchema, payload)
    if (!result.success) {
        throwContractError(slug, formatSchemaIssues(result.error.issues))
    }

    if (!result.data.success || !result.data.data) {
        throwContractError(slug, "success response did not include showcase data")
    }

    return result.data.data
}

export async function fetchOrganizationLayoutShowcaseServer(
    slug: string
): Promise<OrganizationLayoutShowcase | null> {
    const response = await fetchOrganizationShowcaseResponse(slug)
    if (!response.ok) {
        return handleShowcaseHttpError(response, slug)
    }

    const payload: unknown = await response.json()
    const organization = parseOrganizationLayoutShowcaseResponse(slug, payload)

    return {
        id: organization.id,
        name: organization.name,
        logo: organization.logo,
        brandColor: organization.brandColor,
        font: organization.font,
        tagline: organization.tagline,
    }
}

export async function fetchOrganizationOgShowcaseServer(
    slug: string
): Promise<OrganizationOgShowcase | null> {
    const response = await fetchOrganizationShowcaseResponse(slug)
    if (!response.ok) {
        return handleShowcaseHttpError(response, slug)
    }

    const payload: unknown = await response.json()
    const result = safeParseSchema(organizationOgShowcaseResponseSchema, payload)
    if (!result.success) {
        throwContractError(slug, formatSchemaIssues(result.error.issues))
    }

    const organization = result.data.success ? result.data.data?.organization : null

    if (!organization) {
        throwContractError(slug, "success response did not include OG organization data")
    }

    return {
        name: organization.name,
        brandColor: organization.brandColor,
    }
}
