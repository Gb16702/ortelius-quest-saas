import { type BrowserContext, expect, type Page } from "@playwright/test"

export const E2E_CALLER = {
    email: "e2e-caller@test.local",
    password: "e2e-test-password",
}
export const E2E_CALLEE = {
    email: "e2e-callee@test.local",
    password: "e2e-test-password",
}
export const E2E_CONVERSATION_ID = "conv_e2e_test"

export async function login(
    context: BrowserContext,
    creds: { email: string; password: string }
): Promise<Page> {
    const page = await context.newPage()
    await page.goto("/login")
    await page.getByLabel(/email/i).fill(creds.email)
    await page.getByLabel(/password/i).fill(creds.password)
    await page.getByRole("button", { name: /sign in|log in|connect/i }).click()
    await page.waitForURL((url) => !/login/.test(url.pathname), { timeout: 15_000 })
    return page
}

export async function gotoConversation(page: Page, conversationId: string) {
    await page.goto(`/conversations/${conversationId}`)
    await expect(page.locator("body")).toBeVisible()
}

/**
 * Reads RTCPeerConnection stats from the page. Walks any global PeerConnection
 * registry installed by the app for testing, or falls back to scanning the
 * Window for known refs.
 */
export async function readPeerStats(page: Page): Promise<{
    bytesReceived: number
    bytesSent: number
    connectionState: RTCPeerConnectionState | null
}> {
    return await page.evaluate(async () => {
        const w = window as unknown as {
            __ORTELIUS_PEER_CONNECTION__?: RTCPeerConnection
        }
        const pc = w.__ORTELIUS_PEER_CONNECTION__
        if (!pc) {
            return { bytesReceived: 0, bytesSent: 0, connectionState: null }
        }
        const stats = await pc.getStats()
        let bytesReceived = 0
        let bytesSent = 0
        for (const stat of stats.values()) {
            const s = stat as RTCStats & { bytesReceived?: number; bytesSent?: number }
            if (s.type === "inbound-rtp") bytesReceived += s.bytesReceived ?? 0
            if (s.type === "outbound-rtp") bytesSent += s.bytesSent ?? 0
        }
        return {
            bytesReceived,
            bytesSent,
            connectionState: pc.connectionState,
        }
    })
}

export async function startAudioCall(callerPage: Page, _conversationId: string) {
    const callButton = callerPage.getByRole("button", { name: /(start call|call|appel)/i })
    await callButton.first().click()
}

export async function acceptIncomingCall(calleePage: Page) {
    const accept = calleePage.getByRole("button", { name: /(accept|accepter)/i })
    await accept.first().click()
}

export async function declineIncomingCall(calleePage: Page) {
    const decline = calleePage.getByRole("button", { name: /(decline|refuser)/i })
    await decline.first().click()
}

export async function endCall(page: Page) {
    const end = page.getByRole("button", { name: /(end call|raccrocher|terminer)/i })
    await end.first().click()
}
