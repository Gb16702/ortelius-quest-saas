import { afterEach, describe, expect, it, mock } from "bun:test"
import { screen, within } from "@testing-library/react"
import type { OrganizationMember } from "@/entities/member"
import { organizationMemberSchema } from "@/entities/member"
import { parseSchema } from "@/shared/lib/validation/valibot-parse"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { EditMemberRoleDialog } from "../edit-member-role-dialog"

function buildMember(
    overrides: Partial<{ id: string; role: string; name: string }> = {}
): OrganizationMember {
    return parseSchema(organizationMemberSchema, {
        id: overrides.id ?? "member-1",
        role: overrides.role ?? "admin",
        createdAt: "2026-01-01T00:00:00.000Z",
        user: {
            id: "user-1",
            name: overrides.name ?? "Ada Lovelace",
            email: "ada@example.test",
            image: null,
            twoFactorEnabled: false,
        },
    })
}

interface RenderOptions {
    member?: OrganizationMember | null
    selectedRole?: string
    isSubmitting?: boolean
    onClose?: () => void
    onRoleChange?: (role: string) => void
    onConfirm?: () => void
    isOpen?: boolean
}

let activeUnmount: (() => void) | null = null

function renderDialog(options: RenderOptions = {}) {
    const member = options.member === undefined ? buildMember() : options.member
    const onClose = options.onClose ?? mock(() => {})
    const onRoleChange = options.onRoleChange ?? mock((_role: string) => {})
    const onConfirm = options.onConfirm ?? mock(() => {})

    const result = renderWithProviders(
        <EditMemberRoleDialog
            isOpen={options.isOpen ?? true}
            member={member}
            selectedRole={options.selectedRole ?? member?.role ?? ""}
            onClose={onClose}
            onRoleChange={onRoleChange}
            onConfirm={onConfirm}
            isSubmitting={options.isSubmitting ?? false}
        />,
        { userEventOptions: { pointerEventsCheck: 0 } }
    )

    activeUnmount = result.unmount
    return { ...result, onClose, onRoleChange, onConfirm }
}

describe("EditMemberRoleDialog", () => {
    afterEach(() => {
        if (activeUnmount) {
            activeUnmount()
            activeUnmount = null
        }
        document.body.innerHTML = ""
    })

    it("renders nothing when there is no member to edit", () => {
        const { queryByRole } = renderDialog({ member: null })

        expect(queryByRole("dialog")).toBeNull()
    })

    it("renders the dialog with the member's name when open", () => {
        renderDialog({ member: buildMember({ name: "Ada Lovelace", role: "member" }) })

        const dialog = screen.getByRole("dialog")
        expect(within(dialog).getByText("Edit Role")).toBeInTheDocument()
        expect(within(dialog).getByText("Ada Lovelace")).toBeInTheDocument()
    })

    it("shows only assignable roles (member, admin) and filters owner out of the choices", () => {
        renderDialog({ member: buildMember({ role: "member" }) })

        const dialog = screen.getByRole("dialog")
        const radios = within(dialog).getAllByRole("radio")
        const radioValues = radios.map((node) => node.getAttribute("value"))

        expect(radioValues).toEqual(["member", "admin"])
        expect(radioValues).not.toContain("owner")
    })

    it("disables the Update Role button when the selected role equals the current role", () => {
        renderDialog({
            member: buildMember({ role: "admin" }),
            selectedRole: "admin",
        })

        const updateButton = screen.getByRole("button", { name: /update role/i })
        expect(updateButton).toBeDisabled()
    })

    it("disables the Update Role button when no role is selected", () => {
        renderDialog({
            member: buildMember({ role: "admin" }),
            selectedRole: "",
        })

        const updateButton = screen.getByRole("button", { name: /update role/i })
        expect(updateButton).toBeDisabled()
    })

    it("enables the Update Role button and calls onConfirm when a different role is picked", async () => {
        const onConfirm = mock(() => {})

        const { user } = renderDialog({
            member: buildMember({ role: "admin" }),
            selectedRole: "member",
            onConfirm,
        })

        const updateButton = screen.getByRole("button", { name: /update role/i })
        expect(updateButton).not.toBeDisabled()

        await user.click(updateButton)

        expect(onConfirm).toHaveBeenCalledTimes(1)
    })

    it("calls onRoleChange with the picked role value when the user selects a different role", async () => {
        const onRoleChange = mock((_role: string) => {})

        const { user } = renderDialog({
            member: buildMember({ role: "admin" }),
            selectedRole: "admin",
            onRoleChange,
        })

        const memberRadio = screen.getByRole("radio", { name: /^member$/i })
        await user.click(memberRadio)

        expect(onRoleChange).toHaveBeenCalledWith("member")
    })

    it("shows the Updating state, disables the action button, and disables the role radios while submitting", () => {
        renderDialog({
            member: buildMember({ role: "admin" }),
            selectedRole: "member",
            isSubmitting: true,
        })

        const updateButton = screen.getByRole("button", { name: /updating/i })
        expect(updateButton).toBeDisabled()

        const radios = screen.getAllByRole("radio")
        for (const radio of radios) {
            expect(radio).toBeDisabled()
        }
    })

    it("calls onClose when the Close button is activated", async () => {
        const onClose = mock(() => {})

        const { user } = renderDialog({
            member: buildMember({ role: "admin" }),
            selectedRole: "admin",
            onClose,
        })

        const closeButton = screen.getByRole("button", { name: /^close$/i })
        await user.click(closeButton)

        expect(onClose).toHaveBeenCalledTimes(1)
    })
})
