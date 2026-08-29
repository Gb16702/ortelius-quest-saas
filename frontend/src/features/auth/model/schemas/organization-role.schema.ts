import * as v from "valibot"
import { RoleSchema } from "@/entities/access"

export const organizationRoleResponseSchema = v.object({
    data: v.object({
        role: v.pipe(
            v.unknown(),
            v.transform((value) => (typeof value === "string" ? value.toLowerCase() : value)),
            RoleSchema
        ),
    }),
})

export const organizationUserRoleResponseSchema = v.object({
    success: v.optional(v.boolean()),
    data: v.optional(
        v.object({
            role: v.pipe(
                v.unknown(),
                v.transform((value) => (typeof value === "string" ? value.toLowerCase() : value)),
                v.nullable(RoleSchema)
            ),
        })
    ),
})
