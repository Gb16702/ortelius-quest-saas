import { expect, test } from "@playwright/test"
import {
    acceptIncomingCall,
    E2E_CALLEE,
    E2E_CALLER,
    E2E_CONVERSATION_ID,
    endCall,
    gotoConversation,
    login,
    readPeerStats,
    startAudioCall,
} from "./helpers/voip"

/**
 * Regression test for the "1 in 2" race-condition bug. The frontend fix
 * uses two refs (callAccepted + peerJoined) instead of a single pendingOffer,
 * so the offer fires regardless of arrival order. This test runs two
 * back-to-back calls between the same pair to exercise both timing paths.
 */
test("two consecutive calls both succeed (regression for race condition)", async ({
    browser,
}) => {
    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })

    const callerPage = await login(callerCtx, E2E_CALLER)
    const calleePage = await login(calleeCtx, E2E_CALLEE)

    await gotoConversation(callerPage, E2E_CONVERSATION_ID)
    await gotoConversation(calleePage, E2E_CONVERSATION_ID)

    for (let i = 0; i < 2; i++) {
        await startAudioCall(callerPage, E2E_CONVERSATION_ID)
        await acceptIncomingCall(calleePage)
        await callerPage.waitForTimeout(4000)

        const stats = await readPeerStats(callerPage)
        expect(stats.connectionState, `attempt ${i + 1}: connectionState`).toBe("connected")
        expect(stats.bytesReceived, `attempt ${i + 1}: bytesReceived`).toBeGreaterThan(500)

        await endCall(callerPage)
        await callerPage.waitForTimeout(1500) // wait for cleanup
    }

    await callerCtx.close()
    await calleeCtx.close()
})
