import { afterEach, describe, expect, it, mock } from "bun:test"
import { cleanup, screen } from "@testing-library/react"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import type { Quote } from "../../model/hooks/use-quote"
import { createQuote } from "../../model/test/quote.factory"
import { QuoteAcceptanceDialog } from "../quotes/quote-acceptance-dialog"

interface RenderOptions {
    isOpen?: boolean
    quote?: Quote | null
    isLoading?: boolean
    onClose?: () => void
    onConfirm?: () => void
}

function renderDialog({
    isOpen = true,
    quote = createQuote(),
    isLoading = false,
    onClose = mock(() => {}),
    onConfirm = mock(() => {}),
}: RenderOptions = {}) {
    return {
        onClose,
        onConfirm,
        ...renderWithProviders(
            <QuoteAcceptanceDialog
                isOpen={isOpen}
                onClose={onClose}
                quote={quote}
                onConfirm={onConfirm}
                isLoading={isLoading}
            />
        ),
    }
}

describe("QuoteAcceptanceDialog", () => {
    afterEach(() => {
        cleanup()
    })

    it("renders the quote summary when open and a quote is provided", () => {
        renderDialog({ quote: createQuote({ quoteNumber: "Q-9999" }) })

        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(screen.getByText(/Quote Q-9999/i)).toBeInTheDocument()
        expect(screen.getByRole("button", { name: /Accept Quote/i })).toBeInTheDocument()
    })

    it("renders nothing when no quote is provided", () => {
        renderDialog({ quote: null })

        expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        expect(screen.queryByRole("button", { name: /Accept Quote/i })).not.toBeInTheDocument()
    })

    it("does not auto-confirm on mount — confirmation requires the user's explicit click", () => {
        const onConfirm = mock(() => {})
        renderDialog({ onConfirm })

        expect(onConfirm).not.toHaveBeenCalled()
    })

    it("keeps the accept button disabled until the user agrees to the terms", () => {
        renderDialog()

        const acceptButton = screen.getByRole("button", { name: /Accept Quote/i })
        expect(acceptButton).toBeDisabled()
    })

    it("requires the user to check the terms checkbox before accepting", async () => {
        const onConfirm = mock(() => {})
        const { user } = renderDialog({ onConfirm })

        const acceptButton = screen.getByRole("button", { name: /Accept Quote/i })
        await user.click(acceptButton)

        expect(onConfirm).not.toHaveBeenCalled()
    })

    it("enables and calls onConfirm exactly once when the user checks the terms and clicks accept", async () => {
        const onConfirm = mock(() => {})
        const { user } = renderDialog({ onConfirm })

        await user.click(screen.getByRole("checkbox"))

        const acceptButton = screen.getByRole("button", { name: /Accept Quote/i })
        expect(acceptButton).toBeEnabled()

        await user.click(acceptButton)

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it("cannot accept the same quote twice — the accept button is disabled while a mutation is in-flight", async () => {
        const onConfirm = mock(() => {})
        const { user, rerender } = renderDialog({ onConfirm })

        await user.click(screen.getByRole("checkbox"))
        await user.click(screen.getByRole("button", { name: /Accept Quote/i }))

        expect(onConfirm).toHaveBeenCalledTimes(1)

        // Simulate the parent transitioning into a loading state right after the
        // first click (use-accept-quote's mutation entering its pending phase).
        rerender(
            <QuoteAcceptanceDialog
                isOpen={true}
                onClose={() => {}}
                quote={createQuote()}
                onConfirm={onConfirm}
                isLoading={true}
            />
        )

        const acceptButtonWhileLoading = screen.getByRole("button", { name: /Accept Quote/i })
        expect(acceptButtonWhileLoading).toBeDisabled()

        await user.click(acceptButtonWhileLoading)
        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it("keeps the dialog open on a 409 conflict (parent does not close on error)", async () => {
        const onConfirm = mock(() => {})
        const onClose = mock(() => {})
        const quote = createQuote()
        const { user, rerender } = renderDialog({ onConfirm, onClose, quote })

        await user.click(screen.getByRole("checkbox"))
        await user.click(screen.getByRole("button", { name: /Accept Quote/i }))

        expect(onConfirm).toHaveBeenCalledTimes(1)

        // Simulate the request-life-cycle: pending while the network call runs,
        // then back to idle with a server-side 409 conflict that the parent
        // surfaces via toast. The parent does not call onClose on error, so the
        // dialog should remain visible.
        rerender(
            <QuoteAcceptanceDialog
                isOpen={true}
                onClose={onClose}
                quote={quote}
                onConfirm={onConfirm}
                isLoading={true}
            />
        )
        rerender(
            <QuoteAcceptanceDialog
                isOpen={true}
                onClose={onClose}
                quote={quote}
                onConfirm={onConfirm}
                isLoading={false}
            />
        )

        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(onClose).not.toHaveBeenCalled()
    })

    it("disables the cancel button while a mutation is in-flight", () => {
        renderDialog({ isLoading: true })

        const cancelButton = screen.getByRole("button", { name: /^Cancel$/i })
        expect(cancelButton).toBeDisabled()
    })

    it("invokes onClose when the user cancels the dialog", async () => {
        const onClose = mock(() => {})
        const { user } = renderDialog({ onClose })

        await user.click(screen.getByRole("button", { name: /^Cancel$/i }))

        expect(onClose).toHaveBeenCalled()
    })

    describe("permission-based render", () => {
        it("does not render the accept button when the parent has gated rendering off (isOpen=false)", () => {
            // The dialog itself is a controlled component — permission gating
            // lives in the parent (QuoteDetailView only renders this dialog for
            // requesters, not for organization users who issued the quote).
            // A user without accept permission therefore receives isOpen=false
            // and never sees the accept button.
            renderDialog({ isOpen: false })

            expect(screen.queryByRole("button", { name: /Accept Quote/i })).not.toBeInTheDocument()
            expect(screen.queryByRole("dialog")).not.toBeInTheDocument()
        })

        it("does not render the accept button when there is no selected quote", () => {
            renderDialog({ quote: null })

            expect(screen.queryByRole("button", { name: /Accept Quote/i })).not.toBeInTheDocument()
        })
    })
})
