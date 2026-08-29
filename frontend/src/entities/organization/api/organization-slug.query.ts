import * as v from "valibot"
import { readJsonResponse } from "@/shared/api/http.response"
import { organizationSlugSchema } from "../model/organization-slug"

const organizationSlugAvailabilityResponseSchema = v.object({
    available: v.boolean(),
    errorCode: v.optional(v.string()),
    suggestedSlug: v.optional(v.string()),
})

export type OrganizationSlugAvailabilityResponse = v.InferOutput<
    typeof organizationSlugAvailabilityResponseSchema
>

export async function checkOrganizationSlug(
    slug: string
): Promise<OrganizationSlugAvailabilityResponse> {
    const parsedSlug = v.parse(organizationSlugSchema, slug)
    const response = await fetch(
        `/api/onboarding/check-organization-slug?slug=${encodeURIComponent(parsedSlug)}`,
        {
            credentials: "include",
            headers: { "Content-Type": "application/json" },
        }
    )

    if (!response.ok) {
        throw new Error(`Failed to check organization URL: ${response.statusText}`)
    }

    return v.parse(organizationSlugAvailabilityResponseSchema, await readJsonResponse(response))
}
