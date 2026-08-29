import { describe, expect, test } from "bun:test"
import type { PersonalUserRequest, UserRequest } from "../../model/request"
import { getRequestChatRecipientName } from "../request-chat-recipient"

const baseRequest = {
    id: "request-1",
    reqNumber: "REQ-001",
    lifecycleStatus: "open",
    closedReason: null,
    categories: ["Freight"],
    services: ["Ocean"],
    comments: null,
    fromDate: "2026-05-11T00:00:00.000Z",
    toDate: "2026-05-12T00:00:00.000Z",
    createdAt: "2026-05-11T00:00:00.000Z",
    updatedAt: "2026-05-11T00:00:00.000Z",
    conversationId: "conversation-1",
    requester: {
        id: "user-1",
        name: "Ada Lovelace",
        email: "ada@example.com",
        image: null,
    },
} satisfies UserRequest

describe("getRequestChatRecipientName", () => {
    test("uses the requester name for organization request rows", () => {
        expect(getRequestChatRecipientName(baseRequest, true)).toBe("Ada Lovelace")
    })

    test("uses the guest requester name for organization request rows", () => {
        const guestRequest = {
            ...baseRequest,
            requester: {
                ...baseRequest.requester,
                id: null,
                name: "Grace Guest",
                email: "grace@example.com",
            },
        } satisfies UserRequest

        expect(getRequestChatRecipientName(guestRequest, true)).toBe("Grace Guest")
    })

    test("uses the organization name for personal request rows", () => {
        const personalRequest = {
            ...baseRequest,
            organization: {
                id: "org-1",
                name: "Ortelius Logistics",
                slug: "ortelius-logistics",
                logo: null,
            },
        } satisfies PersonalUserRequest

        expect(getRequestChatRecipientName(personalRequest, false)).toBe("Ortelius Logistics")
    })

    test("throws instead of rendering a fake fallback for a personal row without organization", () => {
        expect(() => getRequestChatRecipientName(baseRequest, false)).toThrow(
            "Personal request row is missing an organization recipient"
        )
    })
})
