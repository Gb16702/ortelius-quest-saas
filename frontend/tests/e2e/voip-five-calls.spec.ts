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
 * Click the Phone button and verify the click actually triggered a POST.
 * The button can be visible before `currentConversation` is wired up — the
 * onClick then returns silently. We retry up to 3× with a small wait.
 */
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

/**
 * Regression for the "1 in 2" race condition. Drives 5 consecutive 1-to-1
 * calls between the same pair of browser contexts. Before the fix only
 * ~50% would establish audio; after, all 5 must.
 */
test("regression: 5 consecutive calls all connect with audio", async ({ browser }) => {
    test.setTimeout(240_000)

    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })
    await setBypassAuth(callerCtx, CALLER_ID)
    await setBypassAuth(calleeCtx, CALLEE_ID)

    const callerPage = await callerCtx.newPage()
    const calleePage = await calleeCtx.newPage()

    await callerPage.goto(`${FRONT}/me/chat/${CONV_ID}`)
    await calleePage.goto(`${FRONT}/me/chat/${CONV_ID}`)

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

    const results: { attempt: number; callerBytes: number; calleeBytes: number }[] = []

    for (let i = 1; i <= 5; i++) {
        console.log(`--- attempt ${i} ---`)

        const initiateRes = await clickPhoneAndWaitForInitiate(callerPage)
        expect(initiateRes.status(), `attempt ${i}: initiate status`).toBe(201)

        const accept = calleePage.getByRole("button", { name: /accept/i })
        await expect(accept).toBeVisible({ timeout: 10_000 })
        await accept.click()

        await callerPage.waitForTimeout(8_000)

        const callerBytes = await readBytes(callerPage)
        const calleeBytes = await readBytes(calleePage)
        results.push({ attempt: i, callerBytes, calleeBytes })
        console.log(`  caller bytesReceived: ${callerBytes}`)
        console.log(`  callee bytesReceived: ${calleeBytes}`)

        const endBtn = callerPage.getByRole("button", { name: /end call/i })
        if (await endBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
            await endBtn.click()
        }
        await callerPage.waitForTimeout(2_000)
    }

    console.log("Final results:", JSON.stringify(results, null, 2))

    for (const r of results) {
        expect(r.callerBytes, `attempt ${r.attempt}: caller bytesReceived`).toBeGreaterThan(0)
        expect(r.calleeBytes, `attempt ${r.attempt}: callee bytesReceived`).toBeGreaterThan(0)
    }

    await callerCtx.close()
    await calleeCtx.close()
})
