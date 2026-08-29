import type * as v from "valibot"
import {
    TEST_ORG_ID,
    TEST_ORG_NAME,
    TEST_ORG_SLUG,
    TEST_USER_EMAIL,
    TEST_USER_ID,
    TEST_USER_NAME,
} from "@/shared/test/fixtures/identity"
import type { requestDetailSchema } from "../schemas/request.schema"

type RequestDetail = v.InferOutput<typeof requestDetailSchema>

export function createRequestDetail(overrides: Partial<RequestDetail> = {}): RequestDetail {
    return {
        id: "request-1",
        reqNumber: "REQ-0001",
        requesterId: TEST_USER_ID,
        receiverOrganizationId: TEST_ORG_ID,
        conversationId: null,
        lifecycleStatus: "open",
        closedReason: null,
        categories: [
            {
                id: "category-road",
                name: "Road",
                slug: "road",
            },
        ],
        services: [
            {
                id: "service-transport",
                name: "Transport",
                slug: "transport",
                type: "cargo",
            },
        ],
        extraServices: [],
        cargoDetailsId: "cargo-1",
        comments: null,
        documents: [],
        fromDate: "2026-06-01T00:00:00.000Z",
        toDate: "2026-06-05T00:00:00.000Z",
        createdAt: "2026-05-15T00:00:00.000Z",
        updatedAt: "2026-05-15T00:00:00.000Z",
        priority: null,
        requester: {
            id: TEST_USER_ID,
            name: TEST_USER_NAME,
            email: TEST_USER_EMAIL,
            image: null,
        },
        organization: {
            id: TEST_ORG_ID,
            name: TEST_ORG_NAME,
            slug: TEST_ORG_SLUG,
            logo: null,
        },
        cargoDetails: {
            id: "cargo-1",
            weight: 250,
            volume: 1.2,
            palletCount: 2,
            fragility: "robust",
            dimensions: {
                length: 120,
                width: 80,
                height: 100,
            },
            options: {
                hazardous: false,
                insuranceCoverage: false,
                perishableGoods: false,
            },
        },
        assignedTo: null,
        ...overrides,
    }
}
