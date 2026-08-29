import { describe, expect, test } from "bun:test"
import type { RequestLifecycleStatus } from "../../model/request"
import { getRequestActionPolicy } from "../request-action-policy"

const activeStatus = "open" satisfies RequestLifecycleStatus
const currentUserId = "user-current"
const otherUserId = "user-other"

describe("getRequestActionPolicy", () => {
    for (const role of ["admin", "owner"] as const) {
        test(`${role} can assign organization requests across assignee states`, () => {
            for (const assignedToId of [currentUserId, otherUserId, null]) {
                const policy = getRequestActionPolicy({
                    scope: "organization",
                    currentUserRole: role,
                    currentUserId,
                    assignedToId,
                    lifecycleStatus: activeStatus,
                })

                expect(policy.canManageRequest).toBe(true)
                expect(policy.canAssignRequest).toBe(true)
            }
        })
    }

    test("members can manage and assign any organization request", () => {
        for (const assignedToId of [currentUserId, otherUserId, null]) {
            const policy = getRequestActionPolicy({
                scope: "organization",
                currentUserRole: "member",
                currentUserId,
                assignedToId,
                lifecycleStatus: activeStatus,
            })

            expect(policy.canManageRequest).toBe(true)
            expect(policy.canAssignRequest).toBe(true)
        }
    })

    test("personal scope never exposes organization assignment actions", () => {
        const policy = getRequestActionPolicy({
            scope: "personal",
            currentUserRole: "owner",
            currentUserId,
            assignedToId: null,
            lifecycleStatus: activeStatus,
        })

        expect(policy.canManageRequest).toBe(false)
        expect(policy.canAssignRequest).toBe(false)
        expect(policy.canShowAssignmentSummary).toBe(false)
    })

    test("terminal statuses never expose assignment actions", () => {
        const terminalStatuses = ["invoiced", "closed"] satisfies RequestLifecycleStatus[]

        for (const lifecycleStatus of terminalStatuses) {
            const policy = getRequestActionPolicy({
                scope: "organization",
                currentUserRole: "owner",
                currentUserId,
                assignedToId: null,
                lifecycleStatus,
            })

            expect(policy.canManageRequest).toBe(true)
            expect(policy.canAssignRequest).toBe(false)
            expect(policy.canShowAssignmentSummary).toBe(false)
        }
    })

    test("invalid actors cannot manage or assign requests", () => {
        expect(
            getRequestActionPolicy({
                scope: "organization",
                currentUserRole: "unknown",
                currentUserId,
                assignedToId: currentUserId,
                lifecycleStatus: activeStatus,
            }).canAssignRequest
        ).toBe(false)

        expect(
            getRequestActionPolicy({
                scope: "organization",
                currentUserRole: "owner",
                currentUserId: null,
                assignedToId: null,
                lifecycleStatus: activeStatus,
            }).canAssignRequest
        ).toBe(false)
    })
})
