import * as v from "valibot"
import { type Role, RoleSchema } from "./access.permissions"

const normalizedRoleSchema = v.pipe(
    v.unknown(),
    v.transform((value) => (typeof value === "string" ? value.toLowerCase() : value)),
    v.nullable(RoleSchema)
)

export const userRoleResponseSchema = v.looseObject({
    success: v.optional(v.boolean()),
    data: v.optional(
        v.looseObject({
            role: normalizedRoleSchema,
        })
    ),
})

export function parseNullableUserRoleResponse(payload: unknown): Role | null {
    const result = v.safeParse(userRoleResponseSchema, payload)
    if (!result.success || result.output.success === false) return null

    return result.output.data?.role ?? null
}

export function parseUserRoleResponse(payload: unknown): Role {
    const role = parseNullableUserRoleResponse(payload)
    if (!role) {
        throw new Error("User role response did not include a usable role")
    }

    return role
}
