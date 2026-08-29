import { expect, test } from "@playwright/test"
import {
    declineIncomingCall,
    E2E_CALLEE,
    E2E_CALLER,
    E2E_CONVERSATION_ID,
    gotoConversation,
    login,
    startAudioCall,
} from "./helpers/voip"

test("declined call returns both UIs to idle", async ({ browser }) => {
    const callerCtx = await browser.newContext({ permissions: ["microphone"] })
    const calleeCtx = await browser.newContext({ permissions: ["microphone"] })

    const callerPage = await login(callerCtx, E2E_CALLER)
    const calleePage = await login(calleeCtx, E2E_CALLEE)

    await gotoConversation(callerPage, E2E_CONVERSATION_ID)
    await gotoConversation(calleePage, E2E_CONVERSATION_ID)

    await startAudioCall(callerPage, E2E_CONVERSATION_ID)
    await declineIncomingCall(calleePage)

    // No call dialog should remain.
    await expect(
        callerPage.getByRole("dialog", { name: /(connecting|calling)/i })
    ).toBeHidden({ timeout: 5_000 })
    await expect(
        calleePage.getByRole("dialog", { name: /incoming/i })
    ).toBeHidden({ timeout: 5_000 })

    await callerCtx.close()
    await calleeCtx.close()
})
