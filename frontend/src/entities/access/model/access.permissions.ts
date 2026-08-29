import * as v from "valibot"

export const RoleSchema = v.picklist(["member", "admin", "owner"])
export type Role = v.InferOutput<typeof RoleSchema>

export const AssignableRoleSchema = v.picklist(["member", "admin"])
export type AssignableRole = v.InferOutput<typeof AssignableRoleSchema>

function typedEntries<T extends Record<string, unknown>>(obj: T) {
    return Object.entries(obj) as { [K in keyof T]: [K, T[K]] }[keyof T][]
}

const ROLE_META = {
    member: {
        label: "Member",
        description: "Cannot access to organization settings or invite members.",
        assignable: true,
        level: 1,
    },
    admin: {
        label: "Admin",
        description: "Has control over the organization's settings and can invite new members.",
        assignable: true,
        level: 2,
    },
    owner: {
        label: "Owner",
        description: "Full control over the organization.",
        assignable: false,
        level: 3,
    },
} satisfies Record<
    Role,
    {
        label: string
        level: number
        assignable: boolean
        description: string
    }
>

export const ROLE_OPTIONS = typedEntries(ROLE_META)
    .filter(([, meta]) => meta.assignable)
    .map(([value, meta]) => ({
        value: value as AssignableRole,
        label: meta.label,
    }))

export const ROLE_OPTIONS_WITH_OWNER = typedEntries(ROLE_META).map(([value, meta]) => ({
    value,
    label: meta.label,
}))

export const ROLE_OPTIONS_WITH_DESCRIPTION = typedEntries(ROLE_META)
    .filter(([, meta]) => meta.assignable)
    .map(([value, meta]) => ({
        value: value as AssignableRole,
        label: meta.label,
        description: meta.description,
    }))

export function parseRole(value: unknown): Role | null {
    if (typeof value !== "string") return null
    const result = v.safeParse(RoleSchema, value.toLowerCase())
    return result.success ? result.output : null
}

export function isAdminOrOwner(role: Role): boolean {
    return role === "admin" || role === "owner"
}

export function canManageRequests(): boolean {
    return true
}

export function getAssignableRoles(role: Role) {
    return isAdminOrOwner(role) ? ROLE_OPTIONS : []
}

export function getRoleLevel(role: Role): number {
    return ROLE_META[role].level
}

export function getRoleLabel(role: Role): string {
    return ROLE_META[role].label
}
