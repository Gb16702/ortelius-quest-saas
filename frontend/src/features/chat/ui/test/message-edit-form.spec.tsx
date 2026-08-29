// Scope of this file:
// `MessageEditForm` is a thin presentational unit. It reads/writes through the
// `MessageEditContext` provided by `MessageFrame` and renders nothing on its
// own beyond the textarea + inline "escape to cancel / enter to save" hint.
// This file pins that contract: visibility (isEditMode), value binding,
// keyboard delegation, save/cancel wiring, and the in-flight disabled state.
//
// Out of scope for this file (the form does not own these behaviors):
// - "Edit window enforcement: server rejects with 403 and the form stays open"
//   (issue #475). `saveEdit` is owned by `MessageFrame`, which catches errors
//   and decides whether to exit edit mode. The form just calls saveEdit; it
//   never sees the rejection. Asserting "form survives rejection" by wrapping
//   the throw inside the mock proves nothing.
//   Future test target: `src/features/chat/ui/message/test/message-frame.spec.tsx`
//   (or wherever `useMessageEdit` orchestration is exercised end-to-end).
// - "Attachments are preserved across an edit." The form deliberately renders
//   no attachment UI — attachments live on the message body. Asserting absence
//   here only proves the form doesn't *add* attachment UI; it does not prove
//   the message keeps its attachments after a save.
//   Future test target: integration spec that mounts `MessageProvider` +
//   `MessageFrame` and asserts the attachment list is unchanged after editing
//   the body.

import { afterAll, afterEach, describe, expect, it, mock } from "bun:test"
import type { ReactNode, RefObject } from "react"

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

const [{ screen }, { renderWithProviders }, { MessageEditForm }, { MessageEditContext }, React] =
    await Promise.all([
        import("@testing-library/react"),
        import("@/shared/test/render/render-with-providers"),
        import("../message/message-edit-form"),
        import("../message/message-edit.context"),
        import("react"),
    ])

type MessageEditState = React.ContextType<typeof MessageEditContext>
type NonNullEditState = Exclude<MessageEditState, null>

interface RenderOptions {
    isEditMode?: boolean
    initialContent?: string
    isSaving?: boolean
    saveEdit?: () => Promise<void>
    cancelEdit?: () => void
    enterEditMode?: () => void
    processEditKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}

interface RenderResult {
    unmount: () => void
    user: ReturnType<typeof import("@testing-library/user-event").default.setup>
    getState: () => NonNullEditState
}

function renderMessageEditForm(options: RenderOptions = {}): RenderResult {
    const isSaving = options.isSaving ?? false
    let editContent = options.initialContent ?? "original content"
    const textareaRef = { current: null } as RefObject<HTMLTextAreaElement | null>

    const setEditContent = (next: string) => {
        editContent = next
        // Re-render the harness so React reflects the new value.
        rerender()
    }

    const editState: NonNullEditState = {
        isEditMode: options.isEditMode ?? true,
        enterEditMode: options.enterEditMode ?? mock(() => {}),
        cancelEdit: options.cancelEdit ?? mock(() => {}),
        editContent,
        setEditContent,
        saveEdit: options.saveEdit ?? mock(async () => {}),
        isSaving,
        textareaRef,
        processEditKeyDown: options.processEditKeyDown ?? mock(() => {}),
    }

    function Harness({ children }: { children: ReactNode }) {
        return (
            <MessageEditContext.Provider value={editState}>{children}</MessageEditContext.Provider>
        )
    }

    const result = renderWithProviders(<MessageEditForm />, { extraWrapper: Harness })
    const rerender = () => {
        editState.editContent = editContent
        result.rerender(<MessageEditForm />)
    }

    return {
        unmount: result.unmount,
        user: result.user,
        getState: () => editState,
    }
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
    const textareas = document.querySelectorAll("textarea")
    const textarea = textareas[0]
    if (!(textarea instanceof HTMLTextAreaElement)) {
        throw new Error("Expected message-edit-form textarea")
    }
    return textarea
}

describe("MessageEditForm", () => {
    it("renders nothing when isEditMode is false (read-only view)", () => {
        const result = renderMessageEditForm({ isEditMode: false })
        activeUnmount = result.unmount

        expect(document.querySelectorAll("textarea")).toHaveLength(0)
        expect(screen.queryByText(/escape to/i)).toBeNull()
    })

    it("renders the textarea with the current edit content and an enforced max length (5000)", () => {
        const result = renderMessageEditForm({ initialContent: "draft body" })
        activeUnmount = result.unmount

        const textarea = getTextarea()
        expect(textarea.value).toBe("draft body")
        expect(textarea.maxLength).toBe(5000)
    })

    it("calls setEditContent as the user types", async () => {
        const result = renderMessageEditForm({ initialContent: "" })
        activeUnmount = result.unmount

        const textarea = getTextarea()
        await result.user.type(textarea, "edited")
        // Each character triggers a setEditContent; final state reflects the typed string.
        expect(result.getState().editContent).toBe("edited")
    })

    it("invokes cancelEdit when the inline cancel control is clicked", async () => {
        const cancelEdit = mock(() => {})
        const result = renderMessageEditForm({ cancelEdit })
        activeUnmount = result.unmount

        const cancelButton = screen.getByRole("button", { name: /cancel/i })
        await result.user.click(cancelButton)

        expect(cancelEdit).toHaveBeenCalledTimes(1)
    })

    it("invokes saveEdit when the inline save control is clicked", async () => {
        const saveEdit = mock(async () => {})
        const result = renderMessageEditForm({ saveEdit })
        activeUnmount = result.unmount

        const saveButton = screen.getByRole("button", { name: /^save$/i })
        await result.user.click(saveButton)

        expect(saveEdit).toHaveBeenCalledTimes(1)
    })

    it("delegates keyboard handling to processEditKeyDown (Enter and Escape)", async () => {
        const processEditKeyDown = mock((_e: React.KeyboardEvent<HTMLTextAreaElement>) => {})
        const result = renderMessageEditForm({ processEditKeyDown })
        activeUnmount = result.unmount

        const textarea = getTextarea()
        textarea.focus()
        await result.user.keyboard("{Escape}")
        await result.user.keyboard("{Enter}")

        expect(processEditKeyDown).toHaveBeenCalledTimes(2)
        const keys = processEditKeyDown.mock.calls.map((call) => call[0].key)
        expect(keys).toContain("Escape")
        expect(keys).toContain("Enter")
    })

    it("disables the textarea while a save is in flight (server still processing)", () => {
        const result = renderMessageEditForm({ isSaving: true })
        activeUnmount = result.unmount

        expect(getTextarea()).toBeDisabled()
    })
})
