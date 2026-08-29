import { describe, expect, it, mock } from "bun:test"
import { screen } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import type { ActiveOrganization, SessionResponse } from "@/entities/session"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"

mock.module("@/entities/presence", () => ({
    PresenceIndicator: ({ userId }: { userId: string | undefined }) => (
        <output aria-label="Offline" data-user-id={userId} />
    ),
}))

mock.module("react-i18next", () => ({
    Trans: ({ values }: { values?: { name?: string; email?: string } }) => (
        <span>{values?.name ?? values?.email ?? ""}</span>
    ),
    useTranslation: () => ({
        t: (key: string, options?: { name?: string; defaultValue?: string }) => {
            const translations: Record<string, string> = {
                "profile.dialogTitle": "Member Profile",
                "profile.memberActionsLabel": "Member actions",
                "profile.addFavorite": "Add to favorite",
                "profile.removeFavorite": "Remove from favorite",
                "profile.chatWithMember": `Chat with ${options?.name ?? ""}`.trim(),
                "profile.joinedAgo": "Joined recently",
                "profile.assignedRequests": "Assigned requests",
                "profile.noAssignedRequests": "No assigned requests.",
                "role.member": "Member",
            }

            return translations[key] ?? options?.defaultValue ?? key
        },
    }),
}))

const { MemberProfileDialog } = await import("../member-profile-dialog")

const organizationId = "org-1"
const memberUserId = "member-user-1"
const memberName = "Geoffrey Delhaye"
const memberImage = "https://cdn.example.test/geoffrey.png"

const activeOrganization: ActiveOrganization = {
    id: organizationId,
    name: "Acme Logistics",
    slug: "acme",
    logo: null,
    brandLogo: null,
    tagline: null,
    brandColor: null,
}

const sessionData: SessionResponse = {
    user: {
        id: "current-user-1",
        name: "Current User",
        email: "current@example.test",
        emailVerified: true,
        image: null,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
        twoFactorEnabled: false,
        stripeCustomerId: null,
        role: "member",
        profile: null,
        dominantColor: null,
    },
    session: { activeOrganizationId: organizationId },
}

function memberProfileResponse() {
    return HttpResponse.json({
        data: {
            user: {
                id: memberUserId,
                name: memberName,
                email: "geoffrey@example.test",
                image: memberImage,
                dominantColor: null,
                createdAt: "2026-01-01T00:00:00.000Z",
            },
            membership: {
                id: "membership-member-1",
                organizationId,
                role: "member",
                joinedAt: "2026-01-02T00:00:00.000Z",
            },
            assignedRequests: [],
        },
    })
}

function renderDialog({
    isMemberFavorite,
    onAddMemberToFavorites = mock(() => {}),
    onRemoveMemberFromFavorites = mock(() => {}),
}: {
    isMemberFavorite: boolean
    onAddMemberToFavorites?: (target: {
        userId: string
        name: string
        image?: string | null
    }) => void
    onRemoveMemberFromFavorites?: (target: {
        userId: string
        name: string
        image?: string | null
    }) => void
}) {
    const result = renderWithProviders(
        <MemberProfileDialog
            userId={memberUserId}
            isOpen={true}
            onClose={mock(() => {})}
            sessionData={sessionData}
            activeOrganization={activeOrganization}
            onAddMemberToFavorites={onAddMemberToFavorites}
            onRemoveMemberFromFavorites={onRemoveMemberFromFavorites}
            isMemberFavorite={isMemberFavorite}
        />,
        { userEventOptions: { pointerEventsCheck: 0 } }
    )

    return { ...result, onAddMemberToFavorites, onRemoveMemberFromFavorites }
}

describe("MemberProfileDialog favorite action", () => {
    setupMswServer(
        http.get("/api/members/:userId/profile", memberProfileResponse),
        http.get("/api/organizations/:organizationId/user/role", () =>
            HttpResponse.json({ data: { role: "member" } })
        )
    )

    it("shows add favorite with an outline star when the member profile is not favorited", async () => {
        const { user, onAddMemberToFavorites, onRemoveMemberFromFavorites } = renderDialog({
            isMemberFavorite: false,
        })

        await user.click(await screen.findByRole("button", { name: "Member actions" }))

        const addItem = await screen.findByRole("menuitem", { name: "Add to favorite" })
        expect(addItem.querySelector("svg")).toHaveAttribute("fill", "none")

        await user.click(addItem)

        expect(onAddMemberToFavorites).toHaveBeenCalledWith({
            userId: memberUserId,
            name: memberName,
            image: memberImage,
        })
        expect(onRemoveMemberFromFavorites).not.toHaveBeenCalled()
    })

    it("shows remove favorite with a filled star when the member profile is already favorited", async () => {
        const { user, onAddMemberToFavorites, onRemoveMemberFromFavorites } = renderDialog({
            isMemberFavorite: true,
        })

        await user.click(await screen.findByRole("button", { name: "Member actions" }))

        const removeItem = await screen.findByRole("menuitem", { name: "Remove from favorite" })
        expect(screen.queryByRole("menuitem", { name: "Add to favorite" })).toBeNull()
        expect(removeItem.querySelector("svg")).toHaveAttribute("fill", "currentColor")

        await user.click(removeItem)

        expect(onRemoveMemberFromFavorites).toHaveBeenCalledWith({
            userId: memberUserId,
            name: memberName,
            image: memberImage,
        })
        expect(onAddMemberToFavorites).not.toHaveBeenCalled()
    })
})
