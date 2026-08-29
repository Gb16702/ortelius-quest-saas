import * as v from "valibot"

export const organizationBusinessCatalogItemSchema = v.object({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    type: v.optional(v.string()),
    createdAt: v.string(),
    updatedAt: v.string(),
    isSelected: v.optional(v.boolean()),
})

export const organizationBusinessCatalogResponseSchema = v.object({
    success: v.boolean(),
    message: v.optional(v.string()),
    data: v.array(organizationBusinessCatalogItemSchema),
})

export type OrganizationBusinessCatalogItem = v.InferOutput<
    typeof organizationBusinessCatalogItemSchema
>
