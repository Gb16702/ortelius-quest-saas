import { afterEach, describe, expect, it, mock } from "bun:test"

mock.module("@/entities/presence", () => ({
    PresenceIndicator: ({ userId }: { userId: string }) => (
        <output aria-label="Presence" data-user-id={userId} />
    ),
}))

const [
    { cleanup, screen, within },
    { renderWithProviders },
    { defaultLanguage, ensureAppLanguageResources },
    { ShareRequestDialog },
] = await Promise.all([
    import("@testing-library/react"),
    import("@/shared/test/render/render-with-providers"),
    import("@/shared/lib/i18n/marketing"),
    import("../share-request-dialog"),
])

await ensureAppLanguageResources(defaultLanguage)

describe("ShareRequestDialog", () => {
    afterEach(() => {
        cleanup()
    })

    it("lists team chat first, then members alphabetically, and submits multiple destinations", async () => {
        const onShare = mock(() => {})
        const onClose = mock(() => {})
        const { user } = renderWithProviders(
            <ShareRequestDialog
                isOpen={true}
                onClose={onClose}
                organization={{
                    name: "Acme Logistics",
                    logo: "https://cdn.example.test/acme.png",
                }}
                members={[
                    {
                        id: "member-zed",
                        name: "Zed Carrier",
                        email: "zed@example.test",
                    },
                    {
                        id: "member-ada",
                        name: "Ada Broker",
                        email: "ada@example.test",
                    },
                    {
                        id: "current-user",
                        name: "Current User",
                        email: "current@example.test",
                    },
                ]}
                requestNumber="REQ-0001"
                currentUserId="current-user"
                onShare={onShare}
            />
        )

        const destinations = within(screen.getByRole("group")).getAllByRole("checkbox")

        expect(screen.getByPlaceholderText("Search recipients...")).toHaveFocus()
        expect(destinations).toHaveLength(3)
        expect(screen.getByAltText("Acme Logistics logo")).toBeInTheDocument()
        expect(screen.queryByText("Team chat")).not.toBeInTheDocument()
        expect(screen.queryByText("ada@example.test")).not.toBeInTheDocument()
        expect(screen.queryByText("No destinations")).not.toBeInTheDocument()

        const visibleLabels = screen
            .getAllByText(/Acme Logistics|Ada Broker|Zed Carrier/)
            .map((element) => element.textContent)
        expect(visibleLabels).toEqual(["Acme Logistics", "Ada Broker", "Zed Carrier"])
        expect(screen.queryByText("Current User")).not.toBeInTheDocument()

        await user.click(destinations[0])
        await user.click(destinations[1])
        await user.click(screen.getByRole("button", { name: "Share" }))

        expect(onShare).toHaveBeenCalledWith([
            { type: "team-chat" },
            { type: "member", memberId: "member-ada" },
        ])
        expect(onClose).toHaveBeenCalled()
    })

    it("keeps submit enabled and shows a validation error when nothing is selected", async () => {
        const onShare = mock(() => {})
        const onClose = mock(() => {})
        const { user } = renderWithProviders(
            <ShareRequestDialog
                isOpen={true}
                onClose={onClose}
                organization={{
                    name: "Acme Logistics",
                    logo: null,
                }}
                members={[]}
                requestNumber="REQ-0001"
                currentUserId="current-user"
                onShare={onShare}
            />
        )

        const shareButton = screen.getByRole("button", { name: "Share" })

        expect(shareButton).not.toBeDisabled()

        await user.click(shareButton)

        expect(screen.getByText("Select at least one recipient.")).toBeInTheDocument()
        expect(onShare).not.toHaveBeenCalled()
        expect(onClose).not.toHaveBeenCalled()
    })
})
