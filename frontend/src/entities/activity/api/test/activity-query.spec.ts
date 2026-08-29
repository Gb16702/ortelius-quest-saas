import { afterAll, afterEach, describe, expect, it, mock } from "bun:test"

const envDefaults = {
    NODE_ENV: "development",
    AUTH_URL: "http://auth.example.test",
    API_URL: "https://api.example.test",
    LOGIN_URL: "http://login.example.test",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(envDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(envDefaults)) {
    process.env[key] = value
}

mock.module("@/shared/config/env.server", () => ({
    serverEnv: {
        NODE_ENV: "development",
        APP_ORIGIN: "http://app.example.test",
        AUTH_URL: "http://auth.example.test",
        API_URL: "https://api.example.test",
        LOGIN_URL: "http://login.example.test",
    },
}))

const { createActivityEventsInfiniteInitialData } = await import("../activity.query")
const { fetchActivityEventsPageServer } = await import("../activity.server")
const { activityScoreResponseSchema } = await import("../../model/activity.schema")
const { parseSchema } = await import("@/shared/lib/validation/valibot-parse")
const { ACTIVITY_EVENTS_PAGE_SIZE, createActivityEventsSearchParams } = await import(
    "../activity-events-request"
)

const originalFetch = globalThis.fetch
let fetchCalls: { url: string; init?: RequestInit }[] = []

function installFetch(...responses: Response[]) {
    const queue = [...responses]
    const mockedFetch = Object.assign(
        (input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
            const url =
                input instanceof Request
                    ? input.url
                    : input instanceof URL
                      ? input.href
                      : input.toString()
            fetchCalls.push({ url, init })
            return Promise.resolve(queue.shift() ?? new Response(null, { status: 500 }))
        },
        { preconnect: originalFetch.preconnect }
    ) satisfies typeof fetch

    globalThis.fetch = mockedFetch
}

afterEach(() => {
    globalThis.fetch = originalFetch
    fetchCalls = []
})

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

describe("activity events query helpers", () => {
    it("builds bounded activity event request params", () => {
        const params = createActivityEventsSearchParams({
            organizationId: "org-1",
            actorId: "user-1",
            datePreset: "all",
            eventTypes: ["request:created", "member_joined"],
            cursor: "cursor-1",
        })

        expect(params.get("organizationId")).toBe("org-1")
        expect(params.get("actorId")).toBe("user-1")
        expect(params.get("eventTypes")).toBe("request:created,member_joined")
        expect(params.get("cursor")).toBe("cursor-1")
        expect(params.get("limit")).toBe(ACTIVITY_EVENTS_PAGE_SIZE.toString())
        expect(params.has("fromDate")).toBe(false)
    })

    it("wraps the loader page in infinite query initial data", () => {
        const firstPage = {
            events: [],
            nextCursor: "next-page",
        }

        expect(createActivityEventsInfiniteInitialData(firstPage)).toEqual({
            pages: [firstPage],
            pageParams: [undefined],
        })
        expect(createActivityEventsInfiniteInitialData(null)).toBeUndefined()
    })

    it("parses activity score responses", () => {
        const response = parseSchema(activityScoreResponseSchema, {
            success: true,
            data: {
                score: 32,
                previousScore: 8,
                totalPoints: 38,
                previousTotalPoints: 9,
                targetPoints: 120,
                periodDays: 30,
                breakdown: [
                    { eventType: "quote-created", count: 2, points: 24 },
                    { eventType: "invoice-created", count: 1, points: 14 },
                ],
            },
        })

        expect(response.data.score).toBe(32)
        expect(response.data.breakdown).toHaveLength(2)
    })
})

describe("activity events server adapter", () => {
    it("fetches and parses the first activity page with bearer auth", async () => {
        installFetch(
            Response.json({
                success: true,
                data: {
                    events: [
                        {
                            id: "event-1",
                            organizationId: "org-1",
                            actorId: null,
                            eventType: "request:created",
                            description: "Request created",
                            metadata: null,
                            createdAt: "2026-05-14T08:00:00.000Z",
                            actor: null,
                        },
                    ],
                    nextCursor: "cursor-next",
                },
            })
        )

        const page = await fetchActivityEventsPageServer({
            organizationId: "org-1",
            actorId: null,
            datePreset: "all",
            eventTypes: null,
            accessToken: "token-123",
        })

        expect(fetchCalls[0]?.url).toBe(
            "https://api.example.test/api/activity?organizationId=org-1&limit=25"
        )
        expect(fetchCalls[0]?.init?.headers).toEqual({
            "Content-Type": "application/json",
            Authorization: "Bearer token-123",
        })
        expect(page.events).toHaveLength(1)
        expect(page.nextCursor).toBe("cursor-next")
    })

    it("surfaces backend activity errors", async () => {
        installFetch(
            Response.json(
                {
                    success: false,
                    message: "Activity unavailable",
                },
                { status: 503 }
            )
        )

        await expect(
            fetchActivityEventsPageServer({
                organizationId: "org-1",
                actorId: null,
                datePreset: "all",
                eventTypes: null,
                accessToken: "token-123",
            })
        ).rejects.toThrow("Activity unavailable")
    })
})
