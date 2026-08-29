import type * as v from "valibot"
import {
    TEST_ORG_ID,
    TEST_ORG_NAME,
    TEST_ORG_SLUG,
    TEST_USER_EMAIL,
    TEST_USER_ID,
    TEST_USER_NAME,
} from "@/shared/test/fixtures/identity"
import type { organizationRequestListItemSchema } from "../schemas/request.schema"

type RequestListItem = v.InferOutput<typeof organizationRequestListItemSchema>

export function createRequest(overrides: Partial<RequestListItem> = {}): RequestListItem {
    return {
        id: "request-1",
        reqNumber: "REQ-0001",
        lifecycleStatus: "open",
        closedReason: null,
        categories: ["road"],
        services: ["transport"],
        comments: null,
        fromDate: "2026-06-01T00:00:00.000Z",
        toDate: "2026-06-05T00:00:00.000Z",
        createdAt: "2026-05-15T00:00:00.000Z",
        updatedAt: "2026-05-15T00:00:00.000Z",
        conversationId: null,
        priority: null,
        requester: {
            id: TEST_USER_ID,
            name: TEST_USER_NAME,
            email: TEST_USER_EMAIL,
            image: null,
        },
        assignedTo: null,
        organization: {
            id: TEST_ORG_ID,
            name: TEST_ORG_NAME,
            slug: TEST_ORG_SLUG,
            logo: null,
        },
        ...overrides,
    }
}
