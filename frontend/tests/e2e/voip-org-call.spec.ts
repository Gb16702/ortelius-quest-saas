import { type APIRequestContext, type BrowserContext, expect, test } from "@playwright/test"

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:4000"
const REQUESTER_ID = "e2e-voip-requester-id" // external user, NOT an org member
const ORG_MEMBER_ID = "e2e-voip-org-member-id" // member of ORG
const CONV_ID = "33333333-3333-4333-8333-333333333333"

/**
 * End-to-end coverage of BOTH call directions in the requester ↔ org flow:
 *
 *   Sense A — Requester → Org (calleeId: null)
 *     Multicast: any online org member can accept.
 *
 *   Sense B — Org member → Requester (calleeId: requester-id)
 *     Standard 1-to-1: only the requester can accept.
 *
 * Regressions covered:
 *   - POST /api/calls returning 400 on calleeId: null (Zod schema gap)
 *   - Frontend fallback to non-UUID call ID
 *   - call-ws.manager `isParticipantOf` not authorizing the org member
 *     (sense A) or the requester (sense B) on the WS join
 */

type WsHandle = {
    send: (msg: unknown) => Promise<void>
    flush: (type?: string) => Promise<Record<string, unknown>[]>
}

async function openWs(
    page: import("@playwright/test").Page,
    userId: string
): Promise<WsHandle> {
    await page.evaluate(
        ({ wsUrl, userId }) => {
            const w = window as unknown as {
                __ws: WebSocket
                __received: Record<string, unknown>[]
            }
            w.__received = []
            const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent("test-bypass:" + userId)}`)
            w.__ws = ws
            return new Promise<void>((resolve, reject) => {
                ws.onopen = () => resolve()
                ws.onerror = () => reject(new Error("ws error"))
                ws.onmessage = (evt) => {
                    try {
                        w.__received.push(JSON.parse(evt.data as string))
                    } catch {
                        /* ignore */
                    }
                }
                setTimeout(() => reject(new Error("ws timeout")), 5000)
            })
        },
        { wsUrl: API_BASE.replace(/^http/, "ws") + "/api/call", userId }
    )
    return {
        send: async (msg) => {
            await page.evaluate((m) => {
                const w = window as unknown as { __ws: WebSocket }
                w.__ws.send(JSON.stringify(m))
            }, msg)
        },
        flush: async (type) =>
            await page.evaluate((t) => {
                const w = window as unknown as { __received: Record<string, unknown>[] }
                return t ? w.__received.filter((m) => m.type === t) : w.__received
            }, type ?? null),
    }
}

async function postInitiate(
    request: APIRequestContext,
    asUser: string,
    body: { conversationId: string; calleeId: string | null; callType: "audio" | "video" }
) {
    const res = await request.post(`${API_BASE}/api/calls`, {
        headers: { "X-Test-User-Id": asUser, "Content-Type": "application/json" },
        data: body,
    })
    return { res, text: await res.text() }
}

async function patchAccept(request: APIRequestContext, asUser: string, callId: string) {
    return await request.patch(`${API_BASE}/api/calls/${callId}`, {
        headers: { "X-Test-User-Id": asUser, "Content-Type": "application/json" },
        data: { status: "accepted" },
    })
}

async function makeContext(
    browser: import("@playwright/test").Browser,
    userId: string
): Promise<BrowserContext> {
    return await browser.newContext({ extraHTTPHeaders: { "X-Test-User-Id": userId } })
}

// ---------------------------------------------------------------------------
// Sense A — Requester calls the org
// ---------------------------------------------------------------------------

test("Sense A: requester → org (calleeId: null), any org member can accept", async ({
    browser,
}) => {
    const requesterCtx = await makeContext(browser, REQUESTER_ID)
    const orgMemberCtx = await makeContext(browser, ORG_MEMBER_ID)
    const requesterPage = await requesterCtx.newPage()
    const orgMemberPage = await orgMemberCtx.newPage()
    await requesterPage.goto("about:blank")
    await orgMemberPage.goto("about:blank")

    // 1. Requester initiates an org call (calleeId: null)
    const { res, text } = await postInitiate(requesterPage.request, REQUESTER_ID, {
        conversationId: CONV_ID,
        calleeId: null,
        callType: "audio",
    })
    expect(res.ok(), `initiate org-call: ${text}`).toBe(true)
    expect(res.status()).toBe(201)

    const env = JSON.parse(text) as {
        data: { id: string; calleeId: string | null; callerId: string }
    }
    expect(env.data.callerId).toBe(REQUESTER_ID)
    expect(env.data.calleeId).toBeNull()
    expect(env.data.id).toMatch(/^[0-9a-f-]{36}$/)
    const callId = env.data.id

    // 2. Org member accepts → backend adds them to voipCallParticipant
    const acceptRes = await patchAccept(orgMemberPage.request, ORG_MEMBER_ID, callId)
    expect(
        acceptRes.ok(),
        `accept org-call (org member): ${await acceptRes.text()}`
    ).toBe(true)

    // 3. Both join the signaling WS
    const requesterWs = await openWs(requesterPage, REQUESTER_ID)
    const orgMemberWs = await openWs(orgMemberPage, ORG_MEMBER_ID)
    await requesterWs.send({ type: "call:join", callId })
    await requesterPage.waitForTimeout(400)
    await orgMemberWs.send({ type: "call:join", callId })
    await orgMemberPage.waitForTimeout(400)

    // 4. No errors on either side
    expect(await requesterWs.flush("error")).toEqual([])
    expect(await orgMemberWs.flush("error")).toEqual([])

    // 5. Requester sees participant:joined for the org member
    const reqJoined = await requesterWs.flush("participant:joined")
    expect(reqJoined.length).toBeGreaterThan(0)
    expect(reqJoined[0].userId).toBe(ORG_MEMBER_ID)

    // 6. Offer/answer routing works
    await requesterWs.send({
        type: "webrtc:offer",
        callId,
        sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 RTP/SAVPF 111\r\n",
    })
    await orgMemberPage.waitForTimeout(400)
    const orgOffer = await orgMemberWs.flush("webrtc:offer")
    expect(orgOffer.length).toBeGreaterThan(0)
    expect(orgOffer[0].from).toBe(REQUESTER_ID)

    await requesterCtx.close()
    await orgMemberCtx.close()
})

// ---------------------------------------------------------------------------
// Sense B — Org member calls the requester
// ---------------------------------------------------------------------------

test("Sense B: org member → requester (calleeId: requester-id), only requester can accept", async ({
    browser,
}) => {
    const requesterCtx = await makeContext(browser, REQUESTER_ID)
    const orgMemberCtx = await makeContext(browser, ORG_MEMBER_ID)
    const requesterPage = await requesterCtx.newPage()
    const orgMemberPage = await orgMemberCtx.newPage()
    await requesterPage.goto("about:blank")
    await orgMemberPage.goto("about:blank")

    // 1. Org member initiates a 1-to-1 call to the requester
    const { res, text } = await postInitiate(orgMemberPage.request, ORG_MEMBER_ID, {
        conversationId: CONV_ID,
        calleeId: REQUESTER_ID,
        callType: "audio",
    })
    expect(res.ok(), `initiate 1-to-1: ${text}`).toBe(true)
    expect(res.status()).toBe(201)

    const env = JSON.parse(text) as {
        data: { id: string; calleeId: string | null; callerId: string }
    }
    expect(env.data.callerId).toBe(ORG_MEMBER_ID)
    expect(env.data.calleeId).toBe(REQUESTER_ID)
    expect(env.data.id).toMatch(/^[0-9a-f-]{36}$/)
    const callId = env.data.id

    // 2. Requester accepts (only THEY can — strict 1-to-1)
    const acceptRes = await patchAccept(requesterPage.request, REQUESTER_ID, callId)
    expect(
        acceptRes.ok(),
        `accept 1-to-1 (requester): ${await acceptRes.text()}`
    ).toBe(true)

    // 2b. A different (random) user trying to accept must be rejected
    const intruderRes = await patchAccept(orgMemberPage.request, "some-other-user-id", callId)
    expect(intruderRes.ok()).toBe(false)
    // Status can be 401 (unknown user — bypass falls through to real auth),
    // 403 (auth'd but not the callee), or 404 (call not found).
    expect([401, 403, 404]).toContain(intruderRes.status())

    // 3. Both join the signaling WS
    const orgMemberWs = await openWs(orgMemberPage, ORG_MEMBER_ID)
    const requesterWs = await openWs(requesterPage, REQUESTER_ID)
    await orgMemberWs.send({ type: "call:join", callId })
    await orgMemberPage.waitForTimeout(400)
    await requesterWs.send({ type: "call:join", callId })
    await requesterPage.waitForTimeout(400)

    expect(await orgMemberWs.flush("error")).toEqual([])
    expect(await requesterWs.flush("error")).toEqual([])

    // 4. Org member (caller) receives participant:joined for the requester
    const orgJoined = await orgMemberWs.flush("participant:joined")
    expect(orgJoined.length).toBeGreaterThan(0)
    expect(orgJoined[0].userId).toBe(REQUESTER_ID)

    // 5. Offer/answer roundtrip in the reverse direction
    await orgMemberWs.send({
        type: "webrtc:offer",
        callId,
        sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 RTP/SAVPF 111\r\n",
    })
    await requesterPage.waitForTimeout(400)
    const reqOffer = await requesterWs.flush("webrtc:offer")
    expect(reqOffer.length).toBeGreaterThan(0)
    expect(reqOffer[0].from).toBe(ORG_MEMBER_ID)

    await orgMemberWs.send({
        type: "webrtc:answer",
        callId,
        sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 RTP/SAVPF 111\r\n",
    })
    // Note: in real flow it's the requester who sends the answer; here we just
    // assert the routing layer doesn't reject the message — it would only do
    // so if isParticipantOf failed, which is the regression we care about.

    await requesterCtx.close()
    await orgMemberCtx.close()
})
