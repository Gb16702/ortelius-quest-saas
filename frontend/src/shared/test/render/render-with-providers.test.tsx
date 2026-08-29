import { describe, expect, it } from "bun:test"
import { useQuery } from "@tanstack/react-query"
import { screen, waitFor } from "@testing-library/react"
import { useQueryState } from "nuqs"
import { renderWithProviders } from "./render-with-providers"

function GreetingFromQuery() {
    const query = useQuery({
        queryKey: ["greeting"],
        queryFn: () => Promise.resolve("hello from query"),
    })

    return <span data-testid="greeting">{query.data ?? "loading"}</span>
}

function FilterFromUrl() {
    const [filter] = useQueryState("filter")
    return <span data-testid="filter">{filter ?? "(none)"}</span>
}

function CounterButton() {
    return (
        <button data-testid="increment" type="button">
            click me
        </button>
    )
}

describe("renderWithProviders", () => {
    it("supplies a QueryClient that resolves a trivial useQuery", async () => {
        const { queryClient } = renderWithProviders(<GreetingFromQuery />)

        expect(queryClient).toBeDefined()
        expect(screen.getByTestId("greeting")).toHaveTextContent("loading")

        await waitFor(() => {
            expect(screen.getByTestId("greeting")).toHaveTextContent("hello from query")
        })
    })

    it("supplies a Nuqs adapter so useQueryState reads the seeded URL", () => {
        renderWithProviders(<FilterFromUrl />, {
            nuqsProps: { searchParams: { filter: "active" } },
        })

        expect(screen.getByTestId("filter")).toHaveTextContent("active")
    })

    it("returns a userEvent setup so tests do not have to call setup() themselves", async () => {
        const { user } = renderWithProviders(<CounterButton />)

        expect(user).toBeDefined()
        await user.click(screen.getByTestId("increment"))
    })
})
