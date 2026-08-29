import { expect, test } from "@playwright/test"
import {
    acceptIncomingCall,
    E2E_CALLEE,
    E2E_CALLER,
    E2E_CONVERSATION_ID,
    endCall,
    gotoConversation,
    login,
    startAudioCall,
} from "./helpers/voip"

test("hanging up tears down both ends", async ({ browser }) => {
    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })

    const callerPage = await login(callerCtx, E2E_CALLER)
    const calleePage = await login(calleeCtx, E2E_CALLEE)

    await gotoConversation(callerPage, E2E_CONVERSATION_ID)
    await gotoConversation(calleePage, E2E_CONVERSATION_ID)

    await startAudioCall(callerPage, E2E_CONVERSATION_ID)
    await acceptIncomingCall(calleePage)
    await callerPage.waitForTimeout(2000) // Let connection settle.

    await endCall(callerPage)

    await expect(
        callerPage.getByRole("dialog", { name: /(call|connecting)/i })
    ).toBeHidden({ timeout: 5_000 })
    await expect(
        calleePage.getByRole("dialog", { name: /(call|connecting)/i })
    ).toBeHidden({ timeout: 5_000 })

    await callerCtx.close()
    await calleeCtx.close()
})
