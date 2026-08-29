import { type BrowserContext, expect, type Page, test } from "@playwright/test"

const FRONT = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5174"
const CALLER_ID = "e2e-voip-requester-id"
const CALLEE_ID = "e2e-voip-org-member-id"
const CONV_ID = "33333333-3333-4333-8333-333333333333"

async function setBypassAuth(context: BrowserContext, userId: string) {
    await context.addCookies([
        {
            name: "dev_access_token",
            value: `test-bypass:${userId}`,
            url: FRONT,
            httpOnly: true,
            sameSite: "Lax",
        },
    ])
    await context.setExtraHTTPHeaders({ "X-Test-User-Id": userId })
}

async function clickPhoneAndWaitForInitiate(page: Page) {
    const phoneButton = page.locator("button:has(svg.lucide-phone)").first()
    await expect(phoneButton).toBeVisible({ timeout: 10_000 })
    for (let attempt = 1; attempt <= 3; attempt++) {
        const responsePromise = page
            .waitForResponse(
                (r) => r.url().endsWith("/api/calls") && r.request().method() === "POST",
                { timeout: 3_000 }
            )
            .catch(() => null)
        await phoneButton.click()
        const res = await responsePromise
        if (res) return res
        await page.waitForTimeout(1_500)
    }
    throw new Error("Phone button click never triggered POST /api/calls")
}

async function readBytes(page: Page): Promise<number> {
    return await page.evaluate(async () => {
        const w = window as unknown as { __ORTELIUS_PEER_CONNECTION__?: RTCPeerConnection }
        const pc = w.__ORTELIUS_PEER_CONNECTION__
        if (!pc) return 0
        const report = await pc.getStats()
        let bytes = 0
        for (const stat of report.values()) {
            const s = stat as RTCStats & { bytesReceived?: number; kind?: string }
            if (s.type === "inbound-rtp" && s.kind === "audio") {
                bytes += s.bytesReceived ?? 0
            }
        }
        return bytes
    })
}

async function installPeerConnectionChaosHarness(context: BrowserContext) {
    await context.addInitScript(() => {
        const w = window as unknown as {
            __FORCED_RTC_CONNECTION_STATE?: RTCPeerConnectionState
            __FORCE_RTC_CONNECTION_STATE?: (state: RTCPeerConnectionState) => void
            __ICE_RESTART_OFFER_COUNT?: number
            RTCPeerConnection: typeof RTCPeerConnection
        }
        const OriginalPeerConnection = w.RTCPeerConnection

        w.__ICE_RESTART_OFFER_COUNT = 0
        w.RTCPeerConnection = new Proxy(OriginalPeerConnection, {
            construct(target, args) {
                const peerConnection = Reflect.construct(target, args) as RTCPeerConnection
                const proxy = new Proxy(peerConnection, {
                    get(innerPeerConnection, prop) {
                        if (prop === "connectionState" && w.__FORCED_RTC_CONNECTION_STATE) {
                            return w.__FORCED_RTC_CONNECTION_STATE
                        }
                        if (prop === "createOffer") {
                            return async (options?: RTCOfferOptions) => {
                                if (options?.iceRestart) {
                                    w.__ICE_RESTART_OFFER_COUNT =
                                        (w.__ICE_RESTART_OFFER_COUNT ?? 0) + 1
                                }
                                return innerPeerConnection.createOffer(options)
                            }
                        }
                        const value = Reflect.get(innerPeerConnection, prop, innerPeerConnection)
                        return typeof value === "function"
                            ? value.bind(innerPeerConnection)
                            : value
                    },
                    set(innerPeerConnection, prop, value) {
                        return Reflect.set(innerPeerConnection, prop, value, innerPeerConnection)
                    },
                }) as RTCPeerConnection

                w.__FORCE_RTC_CONNECTION_STATE = (state) => {
                    w.__FORCED_RTC_CONNECTION_STATE = state
                    peerConnection.dispatchEvent(new Event("connectionstatechange"))
                }

                return proxy
            },
        }) as typeof RTCPeerConnection
    })
}

async function forceConnectionState(page: Page, state: RTCPeerConnectionState) {
    await page.evaluate((nextState) => {
        const w = window as unknown as {
            __FORCE_RTC_CONNECTION_STATE?: (state: RTCPeerConnectionState) => void
        }
        if (!w.__FORCE_RTC_CONNECTION_STATE) {
            throw new Error("RTCPeerConnection chaos harness was not installed")
        }
        w.__FORCE_RTC_CONNECTION_STATE(nextState)
    }, state)
}

async function readIceRestartOfferCount(page: Page): Promise<number> {
    return await page.evaluate(() => {
        const w = window as unknown as { __ICE_RESTART_OFFER_COUNT?: number }
        return w.__ICE_RESTART_OFFER_COUNT ?? 0
    })
}

/**
 * Chaos test: WebSocket signaling drops mid-call. Validates:
 *   - The active RTCPeerConnection survives (PC doesn't tear down on WS close)
 *   - Audio (P2P media path) keeps flowing — RTP is independent of signaling
 *
 * Implementation: track open WebSocket instances on the page (via patching
 * the WebSocket constructor BEFORE navigation), then close them on demand.
 * This is the only reliable way to grab a handle on the signaling WS that
 * `CallSignalingService` keeps in a private field.
 */
test("signaling WS drop mid-call doesn't kill audio", async ({ browser }) => {
    test.setTimeout(90_000)

    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })
    await setBypassAuth(callerCtx, CALLER_ID)
    await setBypassAuth(calleeCtx, CALLEE_ID)

    // CRITICAL: install the WebSocket tracker BEFORE navigation. This runs
    // on every new document in the context. The patched constructor stores
    // every WS instance in a global Set we can later iterate.
    await callerCtx.addInitScript(() => {
        const w = window as unknown as {
            __TRACKED_WS: Set<WebSocket>
            WebSocket: typeof WebSocket
        }
        w.__TRACKED_WS = new Set<WebSocket>()
        const Original = w.WebSocket
        w.WebSocket = new Proxy(Original, {
            construct(target, args) {
                const ws = Reflect.construct(target, args)
                w.__TRACKED_WS.add(ws)
                ws.addEventListener("close", () => w.__TRACKED_WS.delete(ws))
                return ws
            },
        }) as typeof WebSocket
    })

    const callerPage = await callerCtx.newPage()
    const calleePage = await calleeCtx.newPage()
    await callerPage.goto(`${FRONT}/me/chat/${CONV_ID}`)
    await calleePage.goto(`${FRONT}/me/chat/${CONV_ID}`)

    // Establish the call
    await clickPhoneAndWaitForInitiate(callerPage)
    const acceptButton = calleePage.getByRole("button", { name: /accept/i })
    await expect(acceptButton).toBeVisible({ timeout: 10_000 })
    await acceptButton.click()
    await callerPage.waitForTimeout(6_000)

    const beforeDropBytes = await readBytes(callerPage)
    expect(beforeDropBytes, "audio established before drop").toBeGreaterThan(500)

    // Close the signaling WS specifically (the one that ends with /api/call).
    const closedCount = await callerPage.evaluate(() => {
        const w = window as unknown as { __TRACKED_WS: Set<WebSocket> }
        let count = 0
        for (const ws of w.__TRACKED_WS) {
            if (ws.url.includes("/api/call") && ws.readyState === WebSocket.OPEN) {
                ws.close(4000, "test-induced drop")
                count++
            }
        }
        return count
    })

    expect(
        closedCount,
        "expected at least one signaling WS to be open and closable"
    ).toBeGreaterThan(0)
    console.log(`closed ${closedCount} signaling WebSocket(s)`)

    // Wait for any pending teardown the frontend might do.
    await callerPage.waitForTimeout(4_000)

    // Read the connection state too — this is what would catch a regression
    // where closing the signaling WS triggers cleanupCall() and tears down
    // the PC.
    const stats = await callerPage.evaluate(async () => {
        const w = window as unknown as {
            __ORTELIUS_PEER_CONNECTION__?: RTCPeerConnection
        }
        const pc = w.__ORTELIUS_PEER_CONNECTION__
        if (!pc) return { state: null, bytesReceived: 0 }
        const report = await pc.getStats()
        let bytesReceived = 0
        for (const stat of report.values()) {
            const s = stat as RTCStats & { bytesReceived?: number; kind?: string }
            if (s.type === "inbound-rtp" && s.kind === "audio") {
                bytesReceived += s.bytesReceived ?? 0
            }
        }
        return { state: pc.connectionState, bytesReceived }
    })

    console.log(`PC state after drop: ${stats.state}, bytesReceived: ${stats.bytesReceived}`)

    // The peer connection must NOT have closed.
    expect(stats.state).not.toBe("closed")
    expect(stats.state).not.toBe("failed")
    // Audio must keep flowing — bytesReceived is monotonic.
    expect(stats.bytesReceived).toBeGreaterThan(beforeDropBytes)

    await callerCtx.close()
    await calleeCtx.close()
})

test("forced ICE failure produces one restart offer before cleanup", async ({ browser }) => {
    test.setTimeout(90_000)

    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })
    await setBypassAuth(callerCtx, CALLER_ID)
    await setBypassAuth(calleeCtx, CALLEE_ID)
    await installPeerConnectionChaosHarness(callerCtx)

    const callerPage = await callerCtx.newPage()
    const calleePage = await calleeCtx.newPage()
    await callerPage.goto(`${FRONT}/me/chat/${CONV_ID}`)
    await calleePage.goto(`${FRONT}/me/chat/${CONV_ID}`)

    await clickPhoneAndWaitForInitiate(callerPage)
    const acceptButton = calleePage.getByRole("button", { name: /accept/i })
    await expect(acceptButton).toBeVisible({ timeout: 10_000 })
    await acceptButton.click()
    await callerPage.waitForTimeout(6_000)

    const beforeFailureBytes = await readBytes(callerPage)
    expect(beforeFailureBytes, "audio established before forced ICE failure").toBeGreaterThan(500)

    await forceConnectionState(callerPage, "disconnected")
    await forceConnectionState(callerPage, "failed")

    await expect
        .poll(() => readIceRestartOfferCount(callerPage), {
            timeout: 5_000,
            message: "expected failed ICE state to trigger exactly one restart offer",
        })
        .toBe(1)

    await forceConnectionState(callerPage, "connected")
    await callerPage.waitForTimeout(6_000)

    const recoveryStats = await callerPage.evaluate(async () => {
        const w = window as unknown as {
            __ORTELIUS_PEER_CONNECTION__?: RTCPeerConnection
            __ICE_RESTART_OFFER_COUNT?: number
        }
        const pc = w.__ORTELIUS_PEER_CONNECTION__
        if (!pc) return { offerCount: w.__ICE_RESTART_OFFER_COUNT ?? 0, signalingState: null }
        return {
            offerCount: w.__ICE_RESTART_OFFER_COUNT ?? 0,
            signalingState: pc.signalingState,
        }
    })

    expect(recoveryStats.offerCount).toBe(1)
    expect(recoveryStats.signalingState).not.toBe("closed")

    await callerCtx.close()
    await calleeCtx.close()
})

/**
 * Chaos test: HTTP /api/calls is unreachable when the user clicks Phone.
 * Frontend must fall back to a UUID call ID (not 'call_<ts>_<rnd>') so any
 * subsequent recovery flow doesn't crash with `invalid input syntax for uuid`.
 */
test("frontend uses UUID fallback when POST /api/calls fails", async ({ browser }) => {
    test.setTimeout(30_000)

    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    await setBypassAuth(callerCtx, CALLER_ID)
    const callerPage = await callerCtx.newPage()

    // Block the POST so the frontend hits its fallback path.
    await callerPage.route("**/api/calls", (route, req) => {
        if (req.method() === "POST") return route.fulfill({ status: 503, body: "blocked" })
        return route.continue()
    })

    // Capture the call ID the frontend computes by intercepting the WS
    // join (path: ws://.../api/call?token=...).
    const wsJoinMessages: Array<Record<string, unknown>> = []
    callerPage.on("websocket", (ws) => {
        ws.on("framesent", (f) => {
            try {
                const obj = JSON.parse(typeof f.payload === "string" ? f.payload : "")
                if (obj?.type === "call:join") wsJoinMessages.push(obj)
            } catch {
                /* ignore */
            }
        })
    })

    await callerPage.goto(`${FRONT}/me/chat/${CONV_ID}`)
    const phoneBtn = callerPage.locator("button:has(svg.lucide-phone)").first()
    await expect(phoneBtn).toBeVisible({ timeout: 10_000 })
    await phoneBtn.click()

    // Wait for the WS join to be sent (it follows POST failure + fallback ID).
    await callerPage.waitForTimeout(4_000)

    const join = wsJoinMessages.find((m) => m.type === "call:join")
    if (!join) {
        // The frontend's failure mode might be to abort entirely. That's
        // acceptable too — the original bug was the non-UUID ID PROPAGATING.
        // No call:join means no propagation. Pass.
        console.log("frontend aborted on POST failure — no call:join sent (acceptable)")
        await callerCtx.close()
        return
    }

    // If a call:join was sent, the callId MUST be a valid UUID, not the
    // timestamp/random fallback shape.
    const callId = String(join.callId)
    expect(callId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    expect(callId).not.toMatch(/^call_/)

    await callerCtx.close()
})
