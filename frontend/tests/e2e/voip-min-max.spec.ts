import { expect, test } from "@playwright/test"
import {
    acceptIncomingCall,
    E2E_CALLEE,
    E2E_CALLER,
    E2E_CONVERSATION_ID,
    gotoConversation,
    login,
    readPeerStats,
    startAudioCall,
} from "./helpers/voip"

/**
 * Regression test for Fix 4: hoisted audio element survives min ↔ max
 * transitions. Before the fix, the <audio remote> was inside both views and
 * srcObject was lost on remount; bytesReceived would dip while reattaching.
 */
test("audio survives minimize ↔ maximize toggles", async ({ browser }) => {
    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })

    const callerPage = await login(callerCtx, E2E_CALLER)
    const calleePage = await login(calleeCtx, E2E_CALLEE)

    await gotoConversation(callerPage, E2E_CONVERSATION_ID)
    await gotoConversation(calleePage, E2E_CONVERSATION_ID)

    await startAudioCall(callerPage, E2E_CONVERSATION_ID)
    await acceptIncomingCall(calleePage)
    await callerPage.waitForTimeout(3000)

    const before = await readPeerStats(callerPage)

    // Minimize
    await callerPage.getByRole("button", { name: /minimize/i }).click()
    await callerPage.waitForTimeout(2000)

    const minimized = await readPeerStats(callerPage)
    expect(minimized.bytesReceived).toBeGreaterThan(before.bytesReceived)

    // Maximize
    await callerPage.getByRole("button", { name: /maximize/i }).click()
    await callerPage.waitForTimeout(2000)

    const maximized = await readPeerStats(callerPage)
    expect(maximized.bytesReceived).toBeGreaterThan(minimized.bytesReceived)

    await callerCtx.close()
    await calleeCtx.close()
})
