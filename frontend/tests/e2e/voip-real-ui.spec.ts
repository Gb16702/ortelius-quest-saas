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

/**
 * Wait until the chat is fully loaded — `currentConversation` is populated
 * AND the React tree has wired the Phone button to a working onClick. We
 * verify by polling: keep clicking until a POST /api/calls fires within 2s.
 *
 * The Phone button can be visible before the conversation context is ready;
 * waitForTimeout(2000) was a flaky proxy for this. This polling approach
 * waits for actual wired behavior, not just DOM presence.
 */
async function clickPhoneAndWaitForInitiate(page: Page) {
    const phoneButton = page.locator("button:has(svg.lucide-phone)").first()
    await expect(phoneButton).toBeVisible({ timeout: 10_000 })

    // Try up to 3 times. Each attempt: click, wait briefly for the POST.
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
        // Click was silent (currentConversation not loaded yet). Wait then retry.
        await page.waitForTimeout(1_500)
    }
    throw new Error(
        "Phone button click never triggered POST /api/calls — conversation context not loaded"
    )
}

test("real UI: caller clicks Phone, callee accepts, signaling completes", async ({ browser }) => {
    test.setTimeout(60_000)

    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })
    await setBypassAuth(callerCtx, CALLER_ID)
    await setBypassAuth(calleeCtx, CALLEE_ID)

    const callerPage = await callerCtx.newPage()
    const calleePage = await calleeCtx.newPage()

    callerPage.on("console", (msg) => {
        if (msg.type() === "error") console.log("[caller console.error]", msg.text())
    })
    calleePage.on("console", (msg) => {
        if (msg.type() === "error") console.log("[callee console.error]", msg.text())
    })

    await callerPage.goto(`${FRONT}/me/chat/${CONV_ID}`)
    await calleePage.goto(`${FRONT}/me/chat/${CONV_ID}`)

    const initiateRes = await clickPhoneAndWaitForInitiate(callerPage)
    expect(initiateRes.status()).toBe(201)

    const acceptButton = calleePage.getByRole("button", { name: /accept/i })
    await expect(acceptButton).toBeVisible({ timeout: 10_000 })
    await acceptButton.click()

    // Wait for the connection to settle.
    await callerPage.waitForTimeout(10_000)

    async function readStats(page: Page) {
        return await page.evaluate(async () => {
            const w = window as unknown as { __ORTELIUS_PEER_CONNECTION__?: RTCPeerConnection }
            const pc = w.__ORTELIUS_PEER_CONNECTION__
            if (!pc) return { state: null, found: false, bytesReceived: 0, bytesSent: 0 }
            const report = await pc.getStats()
            let bytesReceived = 0
            let bytesSent = 0
            for (const stat of report.values()) {
                const s = stat as RTCStats & {
                    bytesReceived?: number
                    bytesSent?: number
                    kind?: string
                }
                if (s.type === "inbound-rtp" && s.kind === "audio") {
                    bytesReceived += s.bytesReceived ?? 0
                }
                if (s.type === "outbound-rtp" && s.kind === "audio") {
                    bytesSent += s.bytesSent ?? 0
                }
            }
            return {
                state: pc.connectionState,
                iceState: pc.iceConnectionState,
                signalingState: pc.signalingState,
                bytesReceived,
                bytesSent,
                found: true,
            }
        })
    }

    const callerStats = await readStats(callerPage)
    const calleeStats = await readStats(calleePage)
    console.log("Caller PC stats:", callerStats)
    console.log("Callee PC stats:", calleeStats)

    expect(callerStats.found).toBe(true)
    expect(calleeStats.found).toBe(true)
    expect(callerStats.state).toBe("connected")
    expect(calleeStats.state).toBe("connected")
    expect(callerStats.signalingState).toBe("stable")
    expect(calleeStats.signalingState).toBe("stable")
    expect(callerStats.bytesReceived).toBeGreaterThan(0)
    expect(calleeStats.bytesReceived).toBeGreaterThan(0)
    expect(callerStats.bytesSent).toBeGreaterThan(0)
    expect(calleeStats.bytesSent).toBeGreaterThan(0)

    await callerCtx.close()
    await calleeCtx.close()
})
