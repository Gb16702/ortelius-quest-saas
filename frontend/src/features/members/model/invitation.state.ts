import * as v from "valibot"
import type { InvitationData } from "@/entities/invitation"

export const invitationStateSchema = v.picklist([
    "loading",
    "valid",
    "unauthenticated",
    "expired",
    "invalid",
    "processing",
    "error",
])

export type InvitationStateValue = v.InferOutput<typeof invitationStateSchema>

export const InvitationState = {
    LOADING: "loading",
    VALID: "valid",
    UNAUTHENTICATED: "unauthenticated",
    EXPIRED: "expired",
    INVALID: "invalid",
    PROCESSING: "processing",
    ERROR: "error",
} as const satisfies Record<string, InvitationStateValue>

export interface InvitationPageData {
    invitation: InvitationData | null
    invitationId: string | null
    error?: string
    state: InvitationStateValue
}

export interface InvitationRouteData extends InvitationPageData {
    url: string
}
