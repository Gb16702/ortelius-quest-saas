import { describe, expect, it } from "bun:test"
import { createSharedRequestMessage } from "../shared-request-message"

describe("createSharedRequestMessage", () => {
    it("builds the canonical request shared system message", () => {
        expect(
            createSharedRequestMessage({
                actorName: "Geoffrey Delhaye",
                fallbackActorName: "Someone",
                requestId: "request-id",
                requestNumber: "REQ-1777940263004",
            })
        ).toEqual({
            content: "Geoffrey Delhaye shared a request",
            metadata: {
                type: "request_shared",
                requestId: "request-id",
                requestNumber: "REQ-1777940263004",
            },
        })
    })

    it("falls back when the actor name is missing", () => {
        expect(
            createSharedRequestMessage({
                actorName: " ",
                fallbackActorName: "Someone",
                requestId: "request-id",
                requestNumber: "REQ-1777940263004",
            }).content
        ).toBe("Someone shared a request")
    })
})
