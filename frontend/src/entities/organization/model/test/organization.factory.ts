import type * as v from "valibot"
import { TEST_ORG_ID, TEST_ORG_NAME, TEST_ORG_SLUG } from "@/shared/test/fixtures/identity"
import type { organizationInfoSchema } from "../organization-info.schema"

type OrganizationInput = v.InferInput<typeof organizationInfoSchema>

export function createOrganization(overrides: Partial<OrganizationInput> = {}): OrganizationInput {
    return {
        id: TEST_ORG_ID,
        name: TEST_ORG_NAME,
        slug: TEST_ORG_SLUG,
        logo: null,
        tagline: null,
        overview: null,
        website: null,
        taxIdType: null,
        taxIdNumber: null,
        emailIntakeEnabled: false,
        brandColor: "#0103B8",
        font: undefined,
        ...overrides,
    }
}
