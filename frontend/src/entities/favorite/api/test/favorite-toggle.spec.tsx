import { describe, expect, it, mock } from "bun:test"
import { QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { createTestQueryClient } from "@/shared/test/render/query-client.factory"
import type { FavoriteItem } from "../../model/favorite.schema"
import { favoriteKeys } from "../favorite.query-keys"

const showPendingToast = mock(() => "favorite-toast")
const showSuccessToast = mock(() => undefined)
const showUndoToast = mock(() => undefined)
const showErrorToast = mock(() => undefined)

mock.module("@/shared/ui/toasts", () => ({
    showErrorToast,
    showPendingToast,
    showSuccessToast,
    showUndoToast,
}))

const { useFavoriteToggle } = await import("../favorite.api")

const favorite: FavoriteItem = {
    id: "favorite-request-1",
    entityType: "request",
    entityId: "request-1",
    organizationId: "org-1",
    label: "REQ-001",
    createdAt: "2026-05-28T10:00:00.000Z",
    meta: { requestNumber: "REQ-001" },
}

function createWrapper(queryClient = createTestQueryClient()) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    }
}

describe("useFavoriteToggle", () => {
    it("shows an undo action after adding any favorite and removes it when undo is clicked", async () => {
        const queryClient = createTestQueryClient()
        queryClient.setQueryData(favoriteKeys.list({ organizationId: "org-1" }), {
            favorites: [],
        })
        const fetchMock = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
            const method = init?.method ?? "GET"
            if (method === "PUT") {
                return Response.json({ success: true, data: { favorite } })
            }

            return Response.json({ success: true })
        })
        window.fetch = fetchMock as unknown as typeof fetch

        const { result } = renderHook(() => useFavoriteToggle(), {
            wrapper: createWrapper(queryClient),
        })

        await act(async () => {
            await result.current.mutateAsync({
                entityType: "request",
                entityId: "request-1",
                isFavorited: false,
                organizationId: "org-1",
                optimisticFavorite: favorite,
            })
        })

        expect(showUndoToast).toHaveBeenCalledWith(
            "Favorite added",
            { onUndo: expect.any(Function) },
            { id: "favorite-toast" }
        )

        const undoOptions = (showUndoToast.mock.calls as unknown[][])[0]?.[1] as {
            onUndo: () => void
        }
        await act(async () => {
            undoOptions.onUndo()
        })

        await waitFor(() => {
            expect(fetchMock).toHaveBeenCalledWith("/api/favorites", {
                method: "DELETE",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entityType: "request",
                    entityId: "request-1",
                    organizationId: "org-1",
                }),
            })
        })
    })
})
