import { describe, expect, it } from "bun:test"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { fireEvent, screen, waitFor } from "@testing-library/react"
import { HttpResponse, http } from "msw"
import { renderWithProviders } from "../render/render-with-providers"
import { setupMswServer } from "../setup/msw-server-lifecycle"
import { server } from "./msw-server"

interface ItemsResponse {
    items: Array<{ id: string; label: string }>
}

function ItemsCounter() {
    const queryClient = useQueryClient()

    const items = useQuery<ItemsResponse>({
        queryKey: ["msw-infra-test", "items"],
        queryFn: async () => {
            const response = await fetch("/api/__test__/items")
            return (await response.json()) as ItemsResponse
        },
    })

    const addItem = useMutation({
        mutationFn: async () => {
            const response = await fetch("/api/__test__/items", {
                method: "POST",
                body: JSON.stringify({ label: "extra" }),
            })
            return await response.json()
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ["msw-infra-test", "items"] }),
    })

    const count = items.data?.items.length

    return (
        <div>
            <span data-testid="count">{count === undefined ? "loading" : String(count)}</span>
            <button data-testid="add" onClick={() => addItem.mutate()} type="button">
                add
            </button>
        </div>
    )
}

describe("MSW server", () => {
    setupMswServer()

    it("intercepts a mutation and invalidates the related query", async () => {
        let items: ItemsResponse["items"] = [{ id: "item-1", label: "alpha" }]
        let postCalls = 0

        server.use(
            http.get("/api/__test__/items", () => HttpResponse.json({ items })),
            http.post("/api/__test__/items", () => {
                postCalls += 1
                items = [...items, { id: "item-2", label: "beta" }]
                return HttpResponse.json({ success: true })
            })
        )

        const { queryClient } = renderWithProviders(<ItemsCounter />)

        await waitFor(() => {
            expect(screen.getByTestId("count")).toHaveTextContent("1")
        })

        fireEvent.click(screen.getByTestId("add"))

        await waitFor(() => {
            expect(postCalls).toBe(1)
        })
        await waitFor(() => {
            expect(screen.getByTestId("count")).toHaveTextContent("2")
        })

        const queryState = queryClient.getQueryState(["msw-infra-test", "items"])
        expect(queryState?.dataUpdateCount ?? 0).toBeGreaterThan(1)
    })
})
