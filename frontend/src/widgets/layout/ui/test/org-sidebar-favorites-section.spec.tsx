import { beforeEach, describe, expect, it, mock } from "bun:test"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { type FavoritesResponse, favoriteKeys } from "@/entities/favorite"
import { renderWithProviders } from "@/shared/test/render/render-with-providers"
import { Sidebar, SidebarContent, SidebarProvider } from "@/shared/ui/sidebar"

const showPendingToast = mock(() => "toast-id")
const showSuccessToast = mock(() => undefined)
const showUndoToast = mock(() => undefined)
const showErrorToast = mock(() => undefined)
const requestQuestAssistantConversationOpen = mock(() => undefined)

mock.module("@/shared/ui/toasts", () => ({
    showErrorToast,
    showPendingToast,
    showRetryErrorToast: mock(() => undefined),
    showSuccessToast,
    showUndoToast,
    toast: {
        dismiss: mock(() => undefined),
    },
}))

mock.module("@/entities/presence", () => ({
    PresenceIndicator: ({ userId }: { userId: string | undefined }) => (
        <output data-testid="presence-indicator" data-user-id={userId}>
            Offline
        </output>
    ),
}))

mock.module("@/features/quest-assistant", () => ({
    requestQuestAssistantConversationOpen,
    setAssistantThreadParamInLocation: (
        location: { pathname: string; search: string; hash: string },
        threadTarget: string
    ) => {
        const searchParams = new URLSearchParams(location.search)
        searchParams.set("t", threadTarget)
        const search = searchParams.toString()
        const hash = location.hash ? `#${location.hash.replace(/^#/, "")}` : ""

        return `${location.pathname}${search ? `?${search}` : ""}${hash}`
    },
}))

mock.module("react-i18next", () => ({
    useTranslation: () => ({
        t: (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? key,
    }),
}))

const { OrgSidebarFavoritesSection } = await import("../org-sidebar-favorites-section")

const organizationId = "org-1"
const memberFavorite = {
    id: "favorite-1",
    entityType: "member",
    entityId: "member-user-1",
    organizationId,
    label: "Geoffrey Delhaye",
    subtitle: "Member profile",
    createdAt: "2026-05-28T10:00:00.000Z",
    meta: {
        name: "Geoffrey Delhaye",
        image: "https://cdn.example.test/geoffrey.png",
    },
} satisfies FavoritesResponse["data"]["favorites"][number]

const assistantConversationFavorite = {
    id: "favorite-assistant-1",
    entityType: "assistant_conversation",
    entityId: "assistant-conversation-1",
    organizationId,
    label: "New chat",
    subtitle: "AI chat",
    createdAt: "2026-05-28T10:00:00.000Z",
    meta: {
        assistantChat: true,
        title: "New chat",
    },
} satisfies FavoritesResponse["data"]["favorites"][number]

function renderFavoritesSection(data: FavoritesResponse["data"] = { favorites: [memberFavorite] }) {
    const result = renderWithProviders(
        <SidebarProvider>
            <Sidebar>
                <SidebarContent>
                    <OrgSidebarFavoritesSection
                        organizationId={organizationId}
                        organizationName="Quest"
                        currentUserId="user-1"
                        slug="quest"
                        onNavigationIntent={() => undefined}
                    />
                </SidebarContent>
            </Sidebar>
        </SidebarProvider>,
        {
            routerProps: {
                initialEntries: ["/org/quest/requests?lifecycleStatus=open"],
            },
        }
    )

    result.queryClient.setQueryData(favoriteKeys.list({ organizationId }), data)

    return result
}

beforeEach(() => {
    showPendingToast.mockClear()
    showSuccessToast.mockClear()
    showUndoToast.mockClear()
    showErrorToast.mockClear()
    requestQuestAssistantConversationOpen.mockClear()
    window.fetch = mock(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input)
        if (url.startsWith("/api/conversations")) {
            return Response.json({
                success: true,
                data: {
                    conversations: [],
                    pagination: {
                        total: 0,
                        limit: 50,
                        offset: 0,
                        hasMore: false,
                    },
                },
            })
        }

        if (url === "/api/favorites/groups" && init?.method === "POST") {
            const body = JSON.parse(String(init.body)) as { organizationId: string; name: string }
            return Response.json({
                success: true,
                data: {
                    group: {
                        id: "favorite-group-1",
                        organizationId: body.organizationId,
                        name: body.name,
                        position: 1000,
                        createdAt: "2026-05-28T10:05:00.000Z",
                        updatedAt: "2026-05-28T10:05:00.000Z",
                    },
                },
            })
        }

        if (url === "/api/favorites/order" && init?.method === "PATCH") {
            return Response.json({ success: true })
        }

        return Response.json({ success: true })
    }) as unknown as typeof fetch
})

describe("OrgSidebarFavoritesSection", () => {
    it("renders member favorites with the team member photo and presence indicator", async () => {
        const { container } = renderFavoritesSection()

        await screen.findByText("Geoffrey Delhaye")

        const image = container.querySelector('img[src="https://cdn.example.test/geoffrey.png"]')
        expect(image).toBeInTheDocument()
        expect(screen.getByTestId("presence-indicator")).toHaveAttribute(
            "data-user-id",
            "member-user-1"
        )
        expect(screen.getByRole("link", { name: /Geoffrey Delhaye/ })).toHaveAttribute(
            "href",
            "/org/quest/requests?lifecycleStatus=open&profile=member-user-1"
        )
        expect(container.querySelector('li[role="presentation"]')).not.toBeInTheDocument()
    })

    it("links assistant conversation favorites to the current route and opens the assistant immediately", async () => {
        const { user } = renderFavoritesSection({
            favorites: [assistantConversationFavorite],
        })

        const link = await screen.findByRole("link", { name: /New chat/ })
        expect(link).toHaveAttribute(
            "href",
            "/org/quest/requests?lifecycleStatus=open&t=assistant-conversation-1"
        )

        await user.click(link)

        expect(requestQuestAssistantConversationOpen).toHaveBeenCalledWith(
            "assistant-conversation-1"
        )
    })

    it("shows a toast and removes the member favorite through the favorites API", async () => {
        const { user } = renderFavoritesSection()

        await user.click(await screen.findByRole("button", { name: "Favorite menu" }))
        await user.click(await screen.findByRole("menuitem", { name: /Remove favorite/ }))

        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites", {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entityType: "member",
                    entityId: "member-user-1",
                    organizationId: "org-1",
                }),
            })
        })
        expect(showPendingToast).toHaveBeenCalledWith("Removing favorite", {
            id: "favorite-toggle:member:member-user-1",
        })
        expect(showSuccessToast).toHaveBeenCalledWith("Favorite removed", { id: "toast-id" })
    })

    it("creates an empty favorite group from the sidebar action", async () => {
        const { user } = renderFavoritesSection({ favorites: [] })

        await user.click(screen.getByRole("button", { name: "Create group" }))
        const input = await screen.findByPlaceholderText("Group name...")
        await user.type(input, "Conv{enter}")

        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites/groups", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: "org-1",
                    name: "Conv",
                }),
            })
        })
        expect(await screen.findByText("Conv")).toBeInTheDocument()
        expect(await screen.findByText("No items")).toBeInTheDocument()
        expect(showSuccessToast).toHaveBeenCalledWith("Group created")
    })

    it("keeps the new group input open when the menu close steals focus", async () => {
        const { user } = renderFavoritesSection()

        await user.click(await screen.findByRole("button", { name: "Favorite menu" }))
        await user.click(await screen.findByRole("menuitem", { name: /Move to/ }))
        fireEvent.click(await screen.findByRole("menuitem", { name: /New group/ }))

        const input = await screen.findByPlaceholderText("Group name...")
        await waitFor(() => expect(document.activeElement).toBe(input))
        fireEvent.blur(input)

        expect(screen.getByPlaceholderText("Group name...")).toBeInTheDocument()
    })

    it("moves a favorite into a newly created group with an undo toast", async () => {
        const { user } = renderFavoritesSection()

        await user.click(await screen.findByRole("button", { name: "Favorite menu" }))
        await user.click(await screen.findByRole("menuitem", { name: /Move to/ }))
        fireEvent.click(await screen.findByRole("menuitem", { name: /New group/ }))
        await user.type(await screen.findByPlaceholderText("Group name..."), "Conv{enter}")

        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites/order", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: "org-1",
                    items: [
                        {
                            entityType: "member",
                            entityId: "member-user-1",
                            groupId: "favorite-group-1",
                            position: 0,
                        },
                    ],
                }),
            })
        })
        expect(showUndoToast).toHaveBeenCalledWith(
            "Added to Conv",
            { onUndo: expect.any(Function) },
            { id: "favorite-move:member:member-user-1" }
        )
        expect(showSuccessToast).not.toHaveBeenCalledWith("Group created")

        const undoOptions = (showUndoToast.mock.calls as unknown[][])[0]?.[1] as {
            onUndo: () => void
        }
        undoOptions.onUndo()

        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites/order", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: "org-1",
                    items: [
                        {
                            entityType: "member",
                            entityId: "member-user-1",
                            groupId: null,
                            position: 0,
                        },
                    ],
                }),
            })
        })
    })

    it("removes a favorite group with a success toast", async () => {
        const { queryClient, user } = renderFavoritesSection({
            favorites: [{ ...memberFavorite, groupId: "favorite-group-1", position: 0 }],
            groups: [
                {
                    id: "favorite-group-1",
                    organizationId,
                    name: "Conv",
                    position: 1000,
                    createdAt: "2026-05-28T10:05:00.000Z",
                    updatedAt: "2026-05-28T10:05:00.000Z",
                },
            ],
        })

        await user.click(await screen.findByRole("button", { name: "Favorite group menu" }))
        await user.click(await screen.findByRole("menuitem", { name: /Remove group/ }))

        await waitFor(() => {
            expect(screen.queryByText("Geoffrey Delhaye")).not.toBeInTheDocument()
        })
        expect(
            queryClient.getQueryData<FavoritesResponse["data"]>(
                favoriteKeys.list({ organizationId })
            )
        ).toMatchObject({
            favorites: [],
            groups: [],
        })
        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites/groups/favorite-group-1", {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId: "org-1" }),
            })
        })
        expect(showSuccessToast).toHaveBeenCalledWith("Group removed")
    })

    it("renders root favorites and groups as one top-level ordered list", async () => {
        const { container } = renderFavoritesSection({
            favorites: [{ ...memberFavorite, position: 1000 }],
            groups: [
                {
                    id: "favorite-group-1",
                    organizationId,
                    name: "Conv",
                    position: 0,
                    createdAt: "2026-05-28T10:05:00.000Z",
                    updatedAt: "2026-05-28T10:05:00.000Z",
                },
            ],
        })

        await screen.findByText("Conv")
        await screen.findByText("Geoffrey Delhaye")

        expect(
            Array.from(container.querySelectorAll("[data-favorite-top-level-id]")).map((item) =>
                item.getAttribute("data-favorite-top-level-id")
            )
        ).toEqual(["group:favorite-group-1", "favorite:member:member-user-1"])
    })

    it("moves a grouped favorite out to the top-level list before a group", async () => {
        const { container } = renderFavoritesSection({
            favorites: [{ ...memberFavorite, groupId: "favorite-group-1", position: 0 }],
            groups: [
                {
                    id: "favorite-group-1",
                    organizationId,
                    name: "Conv",
                    position: 0,
                    createdAt: "2026-05-28T10:05:00.000Z",
                    updatedAt: "2026-05-28T10:05:00.000Z",
                },
            ],
        })

        await screen.findByText("Conv")
        await screen.findByText("Geoffrey Delhaye")
        const favorite = container.querySelector("[data-favorite-sortable-id]")
        const group = container.querySelector(
            '[data-favorite-top-level-id="group:favorite-group-1"]'
        )
        if (!(favorite instanceof HTMLElement) || !(group instanceof HTMLElement)) {
            throw new Error("Expected grouped favorite and group row to render")
        }
        group.getBoundingClientRect = () =>
            ({
                bottom: 32,
                height: 32,
                left: 0,
                right: 100,
                top: 0,
                width: 100,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }) satisfies DOMRect
        const elementsFromPoint = document.elementsFromPoint
        document.elementsFromPoint = mock(() => []) as unknown as typeof document.elementsFromPoint

        const favoriteHandle = favorite.querySelector("a")
        if (!(favoriteHandle instanceof HTMLElement)) {
            throw new Error("Expected grouped favorite drag handle to render")
        }

        fireEvent.pointerDown(favoriteHandle, { button: 0, clientX: 8, clientY: 48, pointerId: 1 })
        fireEvent.pointerMove(window, { clientX: 8, clientY: -16, pointerId: 1 })

        await waitFor(() => {
            expect(
                Array.from(container.querySelectorAll("[data-favorite-top-level-id]")).map((item) =>
                    item.getAttribute("data-favorite-top-level-id")
                )
            ).toEqual(["favorite:member:member-user-1", "group:favorite-group-1"])
        })

        fireEvent.pointerUp(window, { clientX: 8, clientY: -16, pointerId: 1 })
        document.elementsFromPoint = elementsFromPoint

        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites/order", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: "org-1",
                    items: [
                        {
                            entityType: "member",
                            entityId: "member-user-1",
                            groupId: null,
                            position: 0,
                        },
                    ],
                    groups: [{ id: "favorite-group-1", position: 1000 }],
                }),
            })
        })
    })

    it("reorders a root favorite around a group when dropped on the group header", async () => {
        const { container } = renderFavoritesSection({
            favorites: [{ ...memberFavorite, position: 0 }],
            groups: [
                {
                    id: "favorite-group-1",
                    organizationId,
                    name: "Conv",
                    position: 1000,
                    createdAt: "2026-05-28T10:05:00.000Z",
                    updatedAt: "2026-05-28T10:05:00.000Z",
                },
            ],
        })

        await screen.findByText("Conv")
        await screen.findByText("Geoffrey Delhaye")
        const favorite = container.querySelector(
            '[data-favorite-sortable-id="favorite:member:member-user-1"]'
        )
        const group = container.querySelector(
            '[data-favorite-top-level-id="group:favorite-group-1"]'
        )
        if (!(favorite instanceof HTMLElement) || !(group instanceof HTMLElement)) {
            throw new Error("Expected root favorite and group row to render")
        }
        group.getBoundingClientRect = () =>
            ({
                bottom: 32,
                height: 32,
                left: 0,
                right: 100,
                top: 0,
                width: 100,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }) satisfies DOMRect

        const favoriteHandle = favorite.querySelector("a")
        if (!(favoriteHandle instanceof HTMLElement)) {
            throw new Error("Expected root favorite drag handle to render")
        }

        fireEvent.pointerDown(favoriteHandle, { button: 0, clientX: 8, clientY: 64, pointerId: 1 })
        fireEvent.pointerMove(window, { clientX: 8, clientY: 24, pointerId: 1 })
        fireEvent.pointerUp(window, { clientX: 8, clientY: 24, pointerId: 1 })

        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites/order", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: "org-1",
                    items: [
                        {
                            entityType: "member",
                            entityId: "member-user-1",
                            groupId: null,
                            position: 1000,
                        },
                    ],
                    groups: [{ id: "favorite-group-1", position: 0 }],
                }),
            })
        })
    })

    it("moves a root favorite into a group when dropped inside the group content", async () => {
        const { container } = renderFavoritesSection({
            favorites: [{ ...memberFavorite, position: 0 }],
            groups: [
                {
                    id: "favorite-group-1",
                    organizationId,
                    name: "Conv",
                    position: 1000,
                    createdAt: "2026-05-28T10:05:00.000Z",
                    updatedAt: "2026-05-28T10:05:00.000Z",
                },
            ],
        })

        await screen.findByText("Conv")
        await screen.findByText("Geoffrey Delhaye")
        const favorite = container.querySelector(
            '[data-favorite-sortable-id="favorite:member:member-user-1"]'
        )
        const group = container.querySelector(
            '[data-favorite-top-level-id="group:favorite-group-1"]'
        )
        const groupContent = container.querySelector(
            '[data-favorite-container-id="favorite-group:favorite-group-1"]'
        )
        if (
            !(favorite instanceof HTMLElement) ||
            !(group instanceof HTMLElement) ||
            !(groupContent instanceof HTMLElement)
        ) {
            throw new Error("Expected root favorite, group row, and group content to render")
        }
        group.getBoundingClientRect = () =>
            ({
                bottom: 64,
                height: 32,
                left: 0,
                right: 100,
                top: 32,
                width: 100,
                x: 0,
                y: 32,
                toJSON: () => ({}),
            }) satisfies DOMRect
        groupContent.getBoundingClientRect = () =>
            ({
                bottom: 104,
                height: 40,
                left: 0,
                right: 100,
                top: 64,
                width: 100,
                x: 0,
                y: 64,
                toJSON: () => ({}),
            }) satisfies DOMRect

        const favoriteHandle = favorite.querySelector("a")
        if (!(favoriteHandle instanceof HTMLElement)) {
            throw new Error("Expected root favorite drag handle to render")
        }

        fireEvent.pointerDown(favoriteHandle, { button: 0, clientX: 8, clientY: 16, pointerId: 1 })
        fireEvent.pointerMove(window, { clientX: 8, clientY: 80, pointerId: 1 })
        fireEvent.pointerUp(window, { clientX: 8, clientY: 80, pointerId: 1 })

        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites/order", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: "org-1",
                    items: [
                        {
                            entityType: "member",
                            entityId: "member-user-1",
                            groupId: "favorite-group-1",
                            position: 0,
                        },
                    ],
                }),
            })
        })
    })

    it("reorders favorite groups optimistically through the order API", async () => {
        const { container } = renderFavoritesSection({
            favorites: [],
            groups: [
                {
                    id: "favorite-group-1",
                    organizationId,
                    name: "Alpha",
                    position: 0,
                    createdAt: "2026-05-28T10:05:00.000Z",
                    updatedAt: "2026-05-28T10:05:00.000Z",
                },
                {
                    id: "favorite-group-2",
                    organizationId,
                    name: "Beta",
                    position: 1000,
                    createdAt: "2026-05-28T10:06:00.000Z",
                    updatedAt: "2026-05-28T10:06:00.000Z",
                },
            ],
        })

        await screen.findByRole("button", { name: "Alpha" })
        await screen.findByRole("button", { name: "Beta" })
        const alpha = container.querySelector('[data-favorite-layout-id="group:favorite-group-1"]')
        const beta = container.querySelector('[data-favorite-layout-id="group:favorite-group-2"]')
        if (!(alpha instanceof HTMLElement) || !(beta instanceof HTMLElement)) {
            throw new Error("Expected favorite group rows to render")
        }
        beta.getBoundingClientRect = () =>
            ({
                bottom: -90,
                height: 10,
                left: 0,
                right: 100,
                top: -100,
                width: 100,
                x: 0,
                y: -100,
                toJSON: () => ({}),
            }) satisfies DOMRect
        const elementsFromPoint = document.elementsFromPoint
        document.elementsFromPoint = mock(() => [
            beta,
        ]) as unknown as typeof document.elementsFromPoint

        const alphaHandle = alpha.querySelector("button")
        if (!(alphaHandle instanceof HTMLElement)) {
            throw new Error("Expected alpha drag handle to render")
        }

        fireEvent.pointerDown(alphaHandle, { button: 0, clientX: 8, clientY: 0, pointerId: 1 })
        fireEvent.pointerMove(window, { clientX: 8, clientY: -92, pointerId: 1 })

        await waitFor(() => {
            expect(
                Array.from(container.querySelectorAll("[data-favorite-layout-id]")).map((item) =>
                    item.textContent?.trim()
                )
            ).toEqual(["Beta", "Alpha"])
        })

        fireEvent.pointerUp(window, { clientX: 8, clientY: -92, pointerId: 1 })
        document.elementsFromPoint = elementsFromPoint

        await waitFor(() => {
            expect(window.fetch).toHaveBeenCalledWith("/api/favorites/order", {
                method: "PATCH",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    organizationId: "org-1",
                    items: [],
                    groups: [
                        { id: "favorite-group-2", position: 0 },
                        { id: "favorite-group-1", position: 1000 },
                    ],
                }),
            })
        })
    })

    it("reorders favorite groups once the cursor crosses the target midpoint", async () => {
        const { container } = renderFavoritesSection({
            favorites: [],
            groups: [
                {
                    id: "favorite-group-1",
                    organizationId,
                    name: "Alpha",
                    position: 0,
                    createdAt: "2026-05-28T10:05:00.000Z",
                    updatedAt: "2026-05-28T10:05:00.000Z",
                },
                {
                    id: "favorite-group-2",
                    organizationId,
                    name: "Beta",
                    position: 1000,
                    createdAt: "2026-05-28T10:06:00.000Z",
                    updatedAt: "2026-05-28T10:06:00.000Z",
                },
            ],
        })

        await screen.findByRole("button", { name: "Alpha" })
        await screen.findByRole("button", { name: "Beta" })
        const alpha = container.querySelector('[data-favorite-layout-id="group:favorite-group-1"]')
        const beta = container.querySelector('[data-favorite-layout-id="group:favorite-group-2"]')
        if (!(alpha instanceof HTMLElement) || !(beta instanceof HTMLElement)) {
            throw new Error("Expected favorite group rows to render")
        }
        beta.getBoundingClientRect = () =>
            ({
                bottom: -84,
                height: 32,
                left: 0,
                right: 100,
                top: -116,
                width: 100,
                x: 0,
                y: -116,
                toJSON: () => ({}),
            }) satisfies DOMRect
        const elementsFromPoint = document.elementsFromPoint
        document.elementsFromPoint = mock(() => [
            beta,
        ]) as unknown as typeof document.elementsFromPoint

        const alphaHandle = alpha.querySelector("button")
        if (!(alphaHandle instanceof HTMLElement)) {
            throw new Error("Expected alpha drag handle to render")
        }

        fireEvent.pointerDown(alphaHandle, { button: 0, clientX: 8, clientY: 0, pointerId: 1 })
        fireEvent.pointerMove(window, { clientX: 8, clientY: -103, pointerId: 1 })

        expect(
            Array.from(container.querySelectorAll("[data-favorite-layout-id]")).map((item) =>
                item.textContent?.trim()
            )
        ).toEqual(["Alpha", "Beta"])

        fireEvent.pointerMove(window, { clientX: 8, clientY: -97, pointerId: 1 })

        await waitFor(() => {
            expect(
                Array.from(container.querySelectorAll("[data-favorite-layout-id]")).map((item) =>
                    item.textContent?.trim()
                )
            ).toEqual(["Beta", "Alpha"])
        })

        fireEvent.pointerUp(window, { clientX: 8, clientY: -97, pointerId: 1 })
        document.elementsFromPoint = elementsFromPoint
    })

    it("cancels an active favorite drag with Escape without persisting the preview order", async () => {
        const { container } = renderFavoritesSection({
            favorites: [{ ...memberFavorite, groupId: "favorite-group-1", position: 0 }],
            groups: [
                {
                    id: "favorite-group-1",
                    organizationId,
                    name: "Conv",
                    position: 0,
                    createdAt: "2026-05-28T10:05:00.000Z",
                    updatedAt: "2026-05-28T10:05:00.000Z",
                },
            ],
        })

        await screen.findByText("Conv")
        await screen.findByText("Geoffrey Delhaye")
        const favorite = container.querySelector(
            '[data-favorite-sortable-id="favorite:member:member-user-1"]'
        )
        const group = container.querySelector(
            '[data-favorite-top-level-id="group:favorite-group-1"]'
        )
        if (!(favorite instanceof HTMLElement) || !(group instanceof HTMLElement)) {
            throw new Error("Expected grouped favorite and group row to render")
        }
        group.getBoundingClientRect = () =>
            ({
                bottom: 32,
                height: 32,
                left: 0,
                right: 100,
                top: 0,
                width: 100,
                x: 0,
                y: 0,
                toJSON: () => ({}),
            }) satisfies DOMRect
        const elementsFromPoint = document.elementsFromPoint
        document.elementsFromPoint = mock(() => []) as unknown as typeof document.elementsFromPoint

        const favoriteHandle = favorite.querySelector("a")
        if (!(favoriteHandle instanceof HTMLElement)) {
            throw new Error("Expected grouped favorite drag handle to render")
        }

        fireEvent.pointerDown(favoriteHandle, { button: 0, clientX: 8, clientY: 48, pointerId: 1 })
        fireEvent.pointerMove(window, { clientX: 8, clientY: -16, pointerId: 1 })

        await waitFor(() => {
            expect(
                Array.from(container.querySelectorAll("[data-favorite-top-level-id]")).map((item) =>
                    item.getAttribute("data-favorite-top-level-id")
                )
            ).toEqual(["favorite:member:member-user-1", "group:favorite-group-1"])
        })

        fireEvent.keyDown(window, { key: "Escape" })
        document.elementsFromPoint = elementsFromPoint

        await waitFor(() => {
            expect(
                Array.from(container.querySelectorAll("[data-favorite-top-level-id]")).map((item) =>
                    item.getAttribute("data-favorite-top-level-id")
                )
            ).toEqual(["group:favorite-group-1"])
        })
        expect(
            container.querySelector(
                '[data-favorite-container-id="favorite-group:favorite-group-1"] [data-favorite-sortable-id="favorite:member:member-user-1"]'
            )
        ).toBeInstanceOf(HTMLElement)

        expect(
            (
                window.fetch as unknown as {
                    mock: { calls: [RequestInfo | URL, RequestInit | undefined][] }
                }
            ).mock.calls.some(
                ([url, init]) => url === "/api/favorites/order" && init?.method === "PATCH"
            )
        ).toBe(false)
    })
})
