import type * as v from "valibot"
import type { activeOrganizationSchema, userSchema } from "./session.schema"

export type User = v.InferOutput<typeof userSchema>

export interface Session {
    activeOrganizationId: string | null
}

export interface SessionResponse {
    user: User | null
    session?: Session | null
    accessToken?: string | null
}

export interface RefreshedAuthSession {
    user: User | null
    accessToken: string | null
    setCookies: string[]
}

export type ActiveOrganization = v.InferOutput<typeof activeOrganizationSchema>
