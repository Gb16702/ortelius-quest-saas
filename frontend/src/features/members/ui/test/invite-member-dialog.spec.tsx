import { afterEach, describe, expect, it, mock } from "bun:test"
import { screen, waitFor, within } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { type AssignableRole, ROLE_OPTIONS } from "@/entities/access"
import type { InviteForm } from "@/entities/invitation"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"

// The dialog reads subscription capacity via `useMemberSubscriptionCapacity`,
// which fetches `/api/subscription/current`. Stub it inline rather than
// reaching across slice boundaries into the subscription entity's test/handlers.
const subscriptionCapacityHandler = http.get("*/api/subscription/current", () =>
    HttpResponse.json({
        plan: "free",
        status: "active",
        seats: { included: 5, used: 1 },
    })
)

// The dialog's content reads the current user via `useUser`. Keep it explicit so
// this test stays focused on invitation form behavior rather than router/session
// context.
mock.module("@/entities/session/model/use-user", () => ({
    useUser: () => null,
}))

const { InviteMemberDialog } = await import("../invite-member-dialog")

interface RenderOptions {
    onClose?: () => void
    onInviteSubmit?: (forms: InviteForm[]) => void | Promise<void>
    isInviting?: boolean
    availableRoles?: { value: AssignableRole; label: string }[]
}

let activeUnmount: (() => void) | null = null

function renderInviteDialog(options: RenderOptions = {}) {
    const onClose = options.onClose ?? mock(() => {})
    const onInviteSubmit = options.onInviteSubmit ?? mock(async (_forms: InviteForm[]) => {})
    const availableRoles = options.availableRoles ?? ROLE_OPTIONS

    const result = renderWithProviders(
        <InviteMemberDialog
            isOpen={true}
            onClose={onClose}
            organizationId="organization-1"
            isInviting={options.isInviting ?? false}
            availableRoles={availableRoles}
            onInviteSubmit={onInviteSubmit}
        />,
        // Radix Dialog applies `pointer-events: none` while the modal is open,
        // which user-event's default pointer check rejects. Disable the check
        // so `userEvent` interactions can drive the inputs inside the dialog.
        { userEventOptions: { pointerEventsCheck: 0 } }
    )

    activeUnmount = result.unmount
    return { ...result, onClose, onInviteSubmit }
}

function getFirstEmailInput(): HTMLInputElement {
    const inputs = screen.getAllByPlaceholderText("colleague@company.com")
    const first = inputs[0]
    if (!(first instanceof HTMLInputElement)) {
        throw new Error("Expected at least one email input")
    }
    return first
}

describe("InviteMemberDialog", () => {
    setupMswServer(subscriptionCapacityHandler)

    afterEach(() => {
        if (activeUnmount) {
            activeUnmount()
            activeUnmount = null
        }
        document.body.innerHTML = ""
    })

    it("blocks submission and shows an accessible error when the email is invalid", async () => {
        const { user, onInviteSubmit, onClose } = renderInviteDialog()

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument()
        })

        const emailInput = getFirstEmailInput()
        await user.type(emailInput, "not-an-email")

        const submitButton = screen.getByRole("button", { name: /send invitations/i })
        await user.click(submitButton)

        const alert = await screen.findByRole("alert")
        expect(within(alert).getByText(/valid email address/i)).toBeInTheDocument()
        expect(emailInput).toHaveAttribute("aria-invalid", "true")
        expect(onInviteSubmit).not.toHaveBeenCalled()
        expect(onClose).not.toHaveBeenCalled()
    })

    it("closes the dialog after a successful invitation submission", async () => {
        const submitted: InviteForm[][] = []
        const onInviteSubmit = mock(async (forms: InviteForm[]) => {
            submitted.push(forms)
        })
        const onClose = mock(() => {})

        const { user } = renderInviteDialog({ onInviteSubmit, onClose })

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument()
        })

        const emailInput = getFirstEmailInput()
        await user.type(emailInput, "teammate@example.test")

        const submitButton = screen.getByRole("button", { name: /send invitations/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(onInviteSubmit).toHaveBeenCalledTimes(1)
        })
        expect(submitted[0]).toEqual([{ email: "teammate@example.test", role: "member" }])

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledTimes(1)
        })
    })

    it("keeps the dialog open with form values preserved while the parent submission is in flight", async () => {
        // Simulate a server round-trip the parent has not resolved yet (e.g. duplicate-email
        // validation, slow network). The dialog must not pre-emptively close or clear values
        // before the parent's promise settles — that contract is what this test pins down.
        const submissionPending = new Promise<void>(() => {})
        const onInviteSubmit = mock(async (_forms: InviteForm[]) => {
            return submissionPending
        })
        const onClose = mock(() => {})

        const { user } = renderInviteDialog({ onInviteSubmit, onClose })

        await waitFor(() => {
            expect(screen.getByRole("dialog")).toBeInTheDocument()
        })

        const emailInput = getFirstEmailInput()
        await user.type(emailInput, "teammate@example.test")

        const submitButton = screen.getByRole("button", { name: /send invitations/i })
        await user.click(submitButton)

        await waitFor(() => {
            expect(onInviteSubmit).toHaveBeenCalledTimes(1)
        })

        expect(onClose).not.toHaveBeenCalled()
        expect(screen.getByRole("dialog")).toBeInTheDocument()
        expect(getFirstEmailInput()).toHaveValue("teammate@example.test")
    })
})
