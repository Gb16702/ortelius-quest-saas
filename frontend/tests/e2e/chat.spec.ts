import { E2E_AUTH_ACCOUNTS } from "./fixtures/api.fixture"
import { expect, test } from "./fixtures/auth.fixture"
import {
    E2E_ORG_SLUG,
    E2E_SHARED_CONVERSATION_ID,
    fetchE2EApiJson,
    uniqueE2EValue,
} from "./helpers/e2e-app"

test.describe("chat send, edit, and delete @critical", () => {
    test("sends a realtime message, clears unread state on open, and edits/deletes an attachment message", async ({
        adminPage,
        memberPage,
        request,
    }) => {
        const liveMessage = uniqueE2EValue("live-chat-message")
        const editedMessage = uniqueE2EValue("edited-chat-message")
        const attachmentName = `${uniqueE2EValue("quote-attachment")}.pdf`

        await memberPage.goto(`/org/${E2E_ORG_SLUG}/chats`)
        await expect(memberPage.getByText("E2E Shared Conversation")).toBeVisible()

        await adminPage.goto(`/org/${E2E_ORG_SLUG}/chat/${E2E_SHARED_CONVERSATION_ID}`)
        await adminPage
            .getByPlaceholder("Send a message to E2E Shared Conversation")
            .fill(liveMessage)
        await adminPage.getByRole("button", { name: "Send message" }).click()

        await expect(adminPage.getByText(liveMessage)).toBeVisible()
        await expect(memberPage.getByText(liveMessage)).toBeVisible()

        await memberPage.getByRole("button", { name: "Filter unread conversations" }).click()
        await expect(memberPage.getByText("E2E Shared Conversation")).toBeVisible()

        const markReadResponse = memberPage.waitForResponse(
            (response) =>
                response
                    .url()
                    .includes(`/api/conversations/${E2E_SHARED_CONVERSATION_ID}/mark-read`) &&
                response.request().method() === "POST" &&
                response.ok()
        )
        await memberPage.getByText("E2E Shared Conversation").click()
        await expect(memberPage.getByText(liveMessage)).toBeVisible()
        await markReadResponse

        await memberPage.goto(`/org/${E2E_ORG_SLUG}/chats`)
        await memberPage.getByRole("button", { name: "Filter unread conversations" }).click()
        await expect(memberPage.getByText("E2E Shared Conversation")).not.toBeVisible()

        const seeded = await fetchE2EApiJson<{ data: { id: string } }>(
            request,
            "admin",
            `/api/messages/${E2E_SHARED_CONVERSATION_ID}`,
            {
                method: "POST",
                data: {
                    content: uniqueE2EValue("attachment-message"),
                    messageType: "text",
                    metadata: {
                        attachments: [
                            {
                                id: crypto.randomUUID(),
                                filename: attachmentName,
                                originalName: attachmentName,
                                size: 2048,
                                mimeType: "application/pdf",
                                s3Key: `e2e/${attachmentName}`,
                                uploadedAt: new Date().toISOString(),
                                uploadedBy: E2E_AUTH_ACCOUNTS.admin.userId,
                            },
                        ],
                    },
                },
            }
        )

        await adminPage.goto(`/org/${E2E_ORG_SLUG}/chat/${E2E_SHARED_CONVERSATION_ID}`)
        const attachmentMessage = adminPage.locator(`[data-message-id="${seeded.data.id}"]`)
        await expect(attachmentMessage.getByText(attachmentName)).toBeVisible()

        await attachmentMessage.hover()
        await attachmentMessage.getByRole("button", { name: "Edit message" }).click()
        await attachmentMessage.locator("textarea").fill(editedMessage)
        await attachmentMessage.getByRole("button", { name: "save" }).click()

        await expect(attachmentMessage.getByText(editedMessage)).toBeVisible()
        await expect(attachmentMessage.getByText("(edited)")).toBeVisible()
        await expect(attachmentMessage.getByText(attachmentName)).toBeVisible()

        await attachmentMessage.hover()
        await attachmentMessage.getByRole("button", { name: "Delete message" }).click()
        await expect(adminPage.getByRole("alertdialog", { name: "Delete Message" })).toBeVisible()
        await adminPage.getByRole("button", { name: "Delete" }).click()

        await expect(attachmentMessage.getByText("This message was deleted")).toBeVisible()
    })
})
