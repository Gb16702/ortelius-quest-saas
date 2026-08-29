import { describe, expect, it } from "bun:test"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { requestDetailResponseSchema } from "../schemas/request.schema"

const requestDetailPayload = {
    data: {
        id: "qa-req-helix-assigned",
        reqNumber: "QA-REQ-HELIX-001",
        requesterId: "qa-user-requester-nora",
        receiverOrganizationId: "qa-org-helix",
        conversationId: "conversation-1",
        lifecycleStatus: "open",
        closedReason: null,
        categories: [
            {
                id: "qa-cat-ocean",
                name: "QA Ocean Freight",
                slug: "qa-ocean-freight",
                createdAt: "2026-05-15T02:53:30.589Z",
                updatedAt: "2026-05-15T02:53:30.589Z",
            },
        ],
        services: [
            {
                id: "qa-svc-ocean-fcl",
                name: "QA Ocean FCL",
                slug: "qa-ocean-fcl",
                type: "cargo",
                createdAt: "2026-05-15T02:53:30.589Z",
            },
        ],
        extraServices: [],
        comments: "Assigned request for member-scoped queue and org/user permission tests.",
        documents: [],
        fromDate: "2026-05-23T10:00:00.000Z",
        toDate: "2026-05-30T10:00:00.000Z",
        createdAt: "2026-05-13T10:00:00.000Z",
        updatedAt: "2026-05-15T03:28:25.497Z",
        priority: "medium",
        requester: {
            id: "qa-user-requester-nora",
            name: "Nora External Requester",
            email: "qa-requester-nora@test.local",
        },
        organization: {
            id: "qa-org-helix",
            name: "QA Helix Forwarding",
            slug: "qa-helix-forwarding",
            taxIdType: null,
        },
        cargoDetails: {
            id: "qa-req-helix-assigned-cargo",
            weight: 9400,
            volume: 40,
            palletCount: 20,
            fragility: "robust",
            options: {
                refrigerated: true,
                hazardous: false,
                oversized: false,
                fragile: false,
            },
            dimensions: {
                length: 200,
                width: 120,
                height: 180,
            },
        },
        assignedTo: {
            id: "qa-user-helix-member",
            name: "Farid Helix Member",
            email: "qa-helix-member@test.local",
            role: "member",
        },
    },
}

describe("requestDetailResponseSchema", () => {
    it("accepts request cargo options that omit newer optional flags", () => {
        const result = parseSchema(requestDetailResponseSchema, requestDetailPayload)

        expect(result.data.cargoDetails.options).toEqual(
            expect.objectContaining({
                hazardous: false,
                insuranceCoverage: false,
                perishableGoods: true,
                refrigerated: true,
            })
        )
    })

    it("preserves an explicit perishable goods flag over the legacy refrigerated flag", () => {
        const payload = {
            ...requestDetailPayload,
            data: {
                ...requestDetailPayload.data,
                cargoDetails: {
                    ...requestDetailPayload.data.cargoDetails,
                    options: {
                        refrigerated: true,
                        hazardous: false,
                        perishableGoods: false,
                    },
                },
            },
        }

        const result = parseSchema(requestDetailResponseSchema, payload)

        expect(result.data.cargoDetails.options.perishableGoods).toBe(false)
    })
})
