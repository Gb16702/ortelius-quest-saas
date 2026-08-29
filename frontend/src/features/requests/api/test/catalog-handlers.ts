import { HttpResponse, http } from "msw"
import { TEST_ORG_SLUG } from "@/shared/test/fixtures/identity"

// Mirrors src/features/requests/api/send-request.queries.ts — production
// fetches `/api/categories/organizations/${organizationId}` and the matching
// services endpoint. Returning a single realistic entry instead of an empty
// array so consumer tests can render at least one row without inlining their
// own seed data.
export const catalogHandlers = [
    http.get("/api/categories/organizations/:organizationId", () =>
        HttpResponse.json({
            data: [
                {
                    id: "category-1",
                    name: "General cargo",
                    slug: `${TEST_ORG_SLUG}-general-cargo`,
                    createdAt: "2025-01-01T00:00:00.000Z",
                    updatedAt: "2025-01-01T00:00:00.000Z",
                },
            ],
        })
    ),
    http.get("/api/services/organizations/:organizationId", () =>
        HttpResponse.json({
            data: [
                {
                    id: "service-1",
                    name: "Container transport",
                    slug: `${TEST_ORG_SLUG}-container-transport`,
                    type: "cargo",
                    createdAt: "2025-01-01T00:00:00.000Z",
                    updatedAt: "2025-01-01T00:00:00.000Z",
                },
            ],
        })
    ),
]
