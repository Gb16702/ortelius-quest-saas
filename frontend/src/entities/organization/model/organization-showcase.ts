import type * as v from "valibot"
import type {
    organizationShowcaseCargoTypeSchema,
    organizationShowcaseDataSchema,
    organizationShowcaseOrganizationSchema,
    organizationShowcaseServiceSchema,
} from "./organization-showcase.schema"

export type OrganizationShowcaseOrganization = v.InferOutput<
    typeof organizationShowcaseOrganizationSchema
>
export type OrganizationShowcaseData = v.InferOutput<typeof organizationShowcaseDataSchema>
export type OrganizationShowcaseService = v.InferOutput<typeof organizationShowcaseServiceSchema>
export type OrganizationShowcaseCargoType = v.InferOutput<
    typeof organizationShowcaseCargoTypeSchema
>
