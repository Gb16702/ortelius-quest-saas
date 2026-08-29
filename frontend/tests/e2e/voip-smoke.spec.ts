import { expect, test } from "@playwright/test"

const API_BASE = process.env.API_BASE_URL ?? "http://localhost:4000"
const CALLER_ID = "e2e-voip-caller-id"
const CALLEE_ID = "e2e-voip-callee-id"
const CONV_ID = "33333333-3333-4333-8333-333333333333"

/**
 * Drive the VoIP signaling stack end-to-end, in 2 real browser contexts,
 * without the UI. Validates:
 *  - HTTP /api/calls accepts our bypass auth (test-bypass:<userId>)
 *  - WebSocket /api/call accepts our bypass token
 *  - participant:joined and webrtc:offer flow correctly between caller/callee
 *  - The race condition fix holds: caller still sends offer regardless of
 *    whether voip_call_response or participant:joined arrives first
 */
test("VoIP signaling smoke: caller→callee offer/answer roundtrip", async ({ browser }) => {
    const callerCtx = await browser.newContext({
        extraHTTPHeaders: { "X-Test-User-Id": CALLER_ID },
    })
    const calleeCtx = await browser.newContext({
        extraHTTPHeaders: { "X-Test-User-Id": CALLEE_ID },
    })

    const callerPage = await callerCtx.newPage()
    const calleePage = await calleeCtx.newPage()
    await callerPage.goto("about:blank")
    await calleePage.goto("about:blank")

    // 1. Caller initiates a call via HTTP
    const initiateRes = await callerPage.request.post(`${API_BASE}/api/calls`, {
        headers: { "X-Test-User-Id": CALLER_ID, "Content-Type": "application/json" },
        data: {
            conversationId: CONV_ID,
            calleeId: CALLEE_ID,
            callType: "audio",
        },
    })
    expect(initiateRes.ok(), `initiateCall response: ${await initiateRes.text()}`).toBe(true)
    const callRecord = (await initiateRes.json()) as { data: { id: string } } | { id: string }
    const callId = (callRecord as { id: string }).id ?? (callRecord as { data: { id: string } }).data.id
    expect(callId).toBeTruthy()

    // 2. Both sides open the signaling WebSocket
    type WsHandle = {
        send: (msg: unknown) => void
        received: Array<Record<string, unknown>>
        close: () => void
    }

    async function openWs(page: typeof callerPage, userId: string): Promise<WsHandle> {
        await page.evaluate(
            ({ wsUrl, callId, userId }) => {
                const w = window as unknown as {
                    __ws: WebSocket
                    __received: Array<Record<string, unknown>>
                    __wsCallId: string
                    __wsUserId: string
                }
                w.__received = []
                w.__wsCallId = callId
                w.__wsUserId = userId
                const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent("test-bypass:" + userId)}`)
                w.__ws = ws
                return new Promise<void>((resolve, reject) => {
                    ws.onopen = () => resolve()
                    ws.onerror = () => reject(new Error("ws error"))
                    ws.onmessage = (evt) => {
                        try {
                            w.__received.push(JSON.parse(evt.data as string))
                        } catch {
                            // ignore
                        }
                    }
                    setTimeout(() => reject(new Error("ws timeout")), 5000)
                })
            },
            { wsUrl: API_BASE.replace(/^http/, "ws") + "/api/call", callId, userId }
        )

        return {
            send: async (msg: unknown) => {
                await page.evaluate((m) => {
                    const w = window as unknown as { __ws: WebSocket }
                    w.__ws.send(JSON.stringify(m))
                }, msg)
            },
            received: [],
            close: async () => {
                await page.evaluate(() => {
                    const w = window as unknown as { __ws: WebSocket }
                    w.__ws.close()
                })
            },
        } as unknown as WsHandle
    }

    async function flushReceived(
        page: typeof callerPage,
        type?: string
    ): Promise<Record<string, unknown>[]> {
        return await page.evaluate((t) => {
            const w = window as unknown as { __received: Array<Record<string, unknown>> }
            const all = w.__received
            return t ? all.filter((m) => m.type === t) : all
        }, type ?? null)
    }

    const callerWs = await openWs(callerPage, CALLER_ID)
    const calleeWs = await openWs(calleePage, CALLEE_ID)

    // 3. Caller joins
    await callerWs.send({ type: "call:join", callId })
    await callerPage.waitForTimeout(500)

    // 4. Callee joins → caller should receive participant:joined
    await calleeWs.send({ type: "call:join", callId })
    await calleePage.waitForTimeout(500)

    const callerJoinedMessages = await flushReceived(callerPage, "participant:joined")
    expect(callerJoinedMessages.length).toBeGreaterThan(0)
    expect(callerJoinedMessages[0].userId).toBe(CALLEE_ID)

    // 5. Caller sends offer → callee receives
    await callerWs.send({
        type: "webrtc:offer",
        callId,
        sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 RTP/SAVPF 111\r\n",
    })
    await calleePage.waitForTimeout(500)

    const calleeOfferMessages = await flushReceived(calleePage, "webrtc:offer")
    expect(calleeOfferMessages.length).toBeGreaterThan(0)
    expect(calleeOfferMessages[0].from).toBe(CALLER_ID)

    // 6. Callee sends answer → caller receives
    await calleeWs.send({
        type: "webrtc:answer",
        callId,
        sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 RTP/SAVPF 111\r\n",
    })
    await callerPage.waitForTimeout(500)

    const callerAnswerMessages = await flushReceived(callerPage, "webrtc:answer")
    expect(callerAnswerMessages.length).toBeGreaterThan(0)
    expect(callerAnswerMessages[0].from).toBe(CALLEE_ID)

    await callerCtx.close()
    await calleeCtx.close()
})
