// Scope of this file:
// Behavior of the `MessageInput` *unit*: keyboard/click submit, optimistic
// reset/restore of the textarea, length limit, replying-to banner, file input
// propagation, typing indicator.
//
// Out of scope for this file (the unit does not own these behaviors):
// - "Pasting an oversized attachment rejects with an inline error" (issue
//   #475). `MessageInput` propagates raw `File[]` upward via `onFilesSelected`;
//   size validation is owned by the consumer (`chat-page-content` actions).
//   Future test target: `src/features/chat/model/test/use-chat-selected-files.spec.ts`
//   (or wherever the validation lives once the policy is wired).
// - "Optimistic message appears immediately; rollback removes it on failure"
//   (issue #475). Optimistic message insertion happens in the chat-page
//   reducer / mutation pipeline, not in the input. The input *does* keep its
//   draft text on submit rejection — that piece is asserted here.
//   Future integration target: `src/features/chat/api/test/chat-mutations.spec.ts`
//   (already exists) and a route-level integration that mounts both.

import { afterAll, afterEach, describe, expect, it, mock } from "bun:test"

const publicEnvDefaults = {
    NODE_ENV: "development",
    VITE_API_URL: "https://api.example.test",
    VITE_PORTAL_ACCOUNT_URL: "https://portal.example.test",
    VITE_WS_URL: "wss://ws.example.test",
} satisfies Record<string, string>

const originalEnv = new Map(Object.keys(publicEnvDefaults).map((key) => [key, process.env[key]]))

for (const [key, value] of Object.entries(publicEnvDefaults)) {
    process.env[key] = value
}

afterAll(() => {
    for (const [key, value] of originalEnv) {
        if (value === undefined) {
            delete process.env[key]
        } else {
            process.env[key] = value
        }
    }
})

const [{ screen }, { renderWithProviders }, { MessageInput }] = await Promise.all([
    import("@testing-library/react"),
    import("@/shared/test/render/render-with-providers"),
    import("../message-input"),
])

type SubmitHandler = (message: string) => boolean | Promise<boolean>

function createSubmitMock(implementation: SubmitHandler = () => true) {
    return mock<SubmitHandler>(implementation)
}

let activeUnmount: (() => void) | null = null

afterEach(() => {
    if (activeUnmount) {
        activeUnmount()
        activeUnmount = null
    }
    document.body.innerHTML = ""
})

function getTextarea(): HTMLTextAreaElement {
    const textarea = screen.getByPlaceholderText(/type a message/i)
    if (!(textarea instanceof HTMLTextAreaElement)) {
        throw new Error("Expected textarea to be an HTMLTextAreaElement")
    }
    return textarea
}

function getSendButton(): HTMLButtonElement {
    return screen.getByRole("button", { name: /send message/i }) as HTMLButtonElement
}

describe("MessageInput keyboard submission", () => {
    it("does not call onSubmit when the textarea is empty and Enter is pressed", async () => {
        const onSubmit = createSubmitMock()
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} />)
        activeUnmount = result.unmount

        getTextarea().focus()
        await result.user.keyboard("{Enter}")

        expect(onSubmit).not.toHaveBeenCalled()
    })

    it("does not call onSubmit when only whitespace has been typed and Enter is pressed", async () => {
        const onSubmit = createSubmitMock()
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} />)
        activeUnmount = result.unmount

        await result.user.type(getTextarea(), "   ")
        await result.user.keyboard("{Enter}")

        expect(onSubmit).not.toHaveBeenCalled()
    })

    it("submits the trimmed content when Enter is pressed", async () => {
        const onSubmit = createSubmitMock()
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} />)
        activeUnmount = result.unmount

        await result.user.type(getTextarea(), "  hello world  ")
        await result.user.keyboard("{Enter}")

        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit.mock.calls[0]?.[0]).toBe("hello world")
    })

    it("inserts a newline on Shift+Enter without submitting", async () => {
        const onSubmit = createSubmitMock()
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} />)
        activeUnmount = result.unmount

        const textarea = getTextarea()
        await result.user.type(textarea, "line one")
        await result.user.keyboard("{Shift>}{Enter}{/Shift}")
        await result.user.type(textarea, "line two")

        expect(onSubmit).not.toHaveBeenCalled()
        expect(textarea.value).toBe("line one\nline two")
    })
})

describe("MessageInput submit lifecycle", () => {
    it("clears the textarea after a successful submit", async () => {
        const onSubmit = createSubmitMock()
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} />)
        activeUnmount = result.unmount

        const textarea = getTextarea()
        await result.user.type(textarea, "hello")
        await result.user.keyboard("{Enter}")

        expect(textarea.value).toBe("")
    })

    it("keeps the draft text when onSubmit synchronously returns false (caller refused)", async () => {
        const onSubmit = createSubmitMock(() => false)
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} />)
        activeUnmount = result.unmount

        const textarea = getTextarea()
        await result.user.type(textarea, "draft to keep")
        await result.user.keyboard("{Enter}")

        expect(textarea.value).toBe("draft to keep")
    })

    it("keeps the draft text when onSubmit rejects (server failure)", async () => {
        const onSubmit = createSubmitMock(() => Promise.reject(new Error("Server unreachable")))
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} />)
        activeUnmount = result.unmount

        const textarea = getTextarea()
        await result.user.type(textarea, "queued draft")
        await result.user.keyboard("{Enter}")

        expect(textarea.value).toBe("queued draft")
    })
})

describe("MessageInput send button", () => {
    it("is disabled when there is no content and no selected files", () => {
        const result = renderWithProviders(<MessageInput onSubmit={createSubmitMock()} />)
        activeUnmount = result.unmount

        expect(getSendButton()).toBeDisabled()
    })

    it("is enabled when at least one file is selected even with empty text", () => {
        const file = new File(["x"], "x.png", { type: "image/png" })
        const result = renderWithProviders(
            <MessageInput onSubmit={createSubmitMock()} selectedFiles={[file]} />
        )
        activeUnmount = result.unmount

        expect(getSendButton()).not.toBeDisabled()
    })

    it("submits via click when the button is enabled", async () => {
        const onSubmit = createSubmitMock()
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} />)
        activeUnmount = result.unmount

        await result.user.type(getTextarea(), "via button")
        await result.user.click(getSendButton())

        expect(onSubmit).toHaveBeenCalledTimes(1)
        expect(onSubmit.mock.calls[0]?.[0]).toBe("via button")
    })

    it("renders the in-flight state (disabled button + 'Sending message' label) when isSubmitting=true", async () => {
        // Note: the input only enforces the in-flight gate at the *button*. The
        // parent owns concurrency for keyboard submits (TanStack Query mutation
        // pending state, idempotency, etc.). Asserting that Enter is also
        // blocked here would over-specify the unit.
        const onSubmit = createSubmitMock()
        const result = renderWithProviders(<MessageInput onSubmit={onSubmit} isSubmitting={true} />)
        activeUnmount = result.unmount

        await result.user.type(getTextarea(), "in flight")

        const sendingButton = screen.getByRole("button", { name: /sending message/i })
        expect(sendingButton).toBeDisabled()
        await result.user.click(sendingButton)
        expect(onSubmit).not.toHaveBeenCalled()
    })
})

describe("MessageInput length limit", () => {
    it("truncates typed input at maxlength and shows a length counter near the cap", async () => {
        const result = renderWithProviders(
            <MessageInput onSubmit={createSubmitMock()} maxlength={20} />
        )
        activeUnmount = result.unmount

        const textarea = getTextarea()
        await result.user.type(textarea, "x".repeat(25))

        expect(textarea.value.length).toBe(20)
        // Counter shows the remaining characters; at the cap, that's "0".
        expect(screen.getByText("0")).toBeInTheDocument()
    })
})

describe("MessageInput typing indicator", () => {
    it("calls onTyping while typing and onStopTyping on submit", async () => {
        const onTyping = mock(() => {})
        const onStopTyping = mock(() => {})
        const result = renderWithProviders(
            <MessageInput
                onSubmit={createSubmitMock()}
                onTyping={onTyping}
                onStopTyping={onStopTyping}
            />
        )
        activeUnmount = result.unmount

        await result.user.type(getTextarea(), "hi")
        expect(onTyping).toHaveBeenCalled()

        await result.user.keyboard("{Enter}")
        expect(onStopTyping).toHaveBeenCalled()
    })
})

describe("MessageInput reply banner", () => {
    it("renders the replying-to banner and invokes onCancelReply when dismissed", async () => {
        const onCancelReply = mock(() => {})
        const result = renderWithProviders(
            <MessageInput
                onSubmit={createSubmitMock()}
                replyingTo={{ id: "m-1", content: "original", senderName: "Ada" }}
                onCancelReply={onCancelReply}
            />
        )
        activeUnmount = result.unmount

        expect(screen.getByText(/replying to ada/i)).toBeInTheDocument()
        await result.user.click(screen.getByRole("button", { name: /cancel reply/i }))

        expect(onCancelReply).toHaveBeenCalledTimes(1)
    })
})

describe("MessageInput file input", () => {
    it("forwards every selected file to onFilesSelected (size policy is the parent's responsibility)", async () => {
        // See file header: the unit does not enforce attachment size. This
        // test pins the contract: regardless of file size, MessageInput hands
        // the raw File[] to the parent so the parent can apply its own policy.
        const onFilesSelected = mock<(files: File[]) => void>(() => {})
        const result = renderWithProviders(
            <MessageInput onSubmit={createSubmitMock()} onFilesSelected={onFilesSelected} />
        )
        activeUnmount = result.unmount

        const fileInput = document.querySelector('input[type="file"]')
        if (!(fileInput instanceof HTMLInputElement)) {
            throw new Error("Expected hidden file input")
        }
        const candidate = new File(["x"], "photo.png", { type: "image/png" })
        await result.user.upload(fileInput, candidate)

        expect(onFilesSelected).toHaveBeenCalledTimes(1)
        const forwarded = onFilesSelected.mock.calls[0]?.[0]
        expect(forwarded?.[0]?.name).toBe("photo.png")
    })
})
