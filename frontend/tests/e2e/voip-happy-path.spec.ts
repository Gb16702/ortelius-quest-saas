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

test("two users can hear each other", async ({ browser }) => {
    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })

    const callerPage = await login(callerCtx, E2E_CALLER)
    const calleePage = await login(calleeCtx, E2E_CALLEE)

    await gotoConversation(callerPage, E2E_CONVERSATION_ID)
    await gotoConversation(calleePage, E2E_CONVERSATION_ID)

    await startAudioCall(callerPage, E2E_CONVERSATION_ID)
    await acceptIncomingCall(calleePage)

    // Allow ICE to establish. With fake media + permissive autoplay this
    // should be < 5s on a healthy backend.
    await callerPage.waitForTimeout(5_000)

    const callerStats = await readPeerStats(callerPage)
    const calleeStats = await readPeerStats(calleePage)

    expect(callerStats.connectionState).toBe("connected")
    expect(calleeStats.connectionState).toBe("connected")
    expect(callerStats.bytesReceived).toBeGreaterThan(1000)
    expect(calleeStats.bytesReceived).toBeGreaterThan(1000)
    expect(callerStats.bytesSent).toBeGreaterThan(1000)
    expect(calleeStats.bytesSent).toBeGreaterThan(1000)

    await callerCtx.close()
    await calleeCtx.close()
})
