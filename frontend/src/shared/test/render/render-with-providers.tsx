import { type QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
    createMemoryHistory,
    createRootRoute,
    createRouter,
    RouterContextProvider,
} from "@tanstack/react-router"
import { type RenderOptions, type RenderResult, render } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { NuqsTestingAdapter } from "nuqs/adapters/testing"
import type { ComponentType, ReactElement, ReactNode } from "react"
import { useState } from "react"
import { createTestQueryClient } from "./query-client.factory"

type NuqsTestingAdapterProps = Omit<Parameters<typeof NuqsTestingAdapter>[0], "children">

export interface TestRouterProps {
    initialEntries?: string[]
    initialIndex?: number
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
    queryClient?: QueryClient
    routerProps?: TestRouterProps
    nuqsProps?: NuqsTestingAdapterProps
    /**
     * Wrap the providers with an extra component (e.g. Toaster, ThemeProvider).
     * Tests opt in only when the component under test relies on it.
     */
    extraWrapper?: ComponentType<{ children: ReactNode }>
    /**
     * Override `userEvent.setup()` options. By default, calls `userEvent.setup()`
     * with no advance timers config so it works under both real and fake timers.
     */
    userEventOptions?: Parameters<typeof userEvent.setup>[0]
}

export interface RenderWithProvidersResult extends RenderResult {
    queryClient: QueryClient
    user: ReturnType<typeof userEvent.setup>
}

function createTestRouter(routerProps: TestRouterProps = {}) {
    const rootRoute = createRootRoute()

    return createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({
            initialEntries: routerProps.initialEntries ?? ["/"],
            initialIndex: routerProps.initialIndex,
        }),
    })
}

export function renderWithProviders(
    ui: ReactElement,
    options: RenderWithProvidersOptions = {}
): RenderWithProvidersResult {
    const {
        queryClient = createTestQueryClient(),
        routerProps,
        nuqsProps,
        extraWrapper: ExtraWrapper,
        userEventOptions,
        ...renderOptions
    } = options

    function Wrapper({ children }: { children: ReactNode }) {
        const [router] = useState(() => createTestRouter(routerProps))
        const tree = (
            <QueryClientProvider client={queryClient}>
                <RouterContextProvider router={router}>
                    {/*
                     * `hasMemory` defaults to true so multiple successive setQueryState
                     * calls compound, matching the route-backed URL state in production.
                     * Tests can opt out via `nuqsProps={{ hasMemory: false }}`.
                     */}
                    <NuqsTestingAdapter hasMemory {...nuqsProps}>
                        {children}
                    </NuqsTestingAdapter>
                </RouterContextProvider>
            </QueryClientProvider>
        )
        return ExtraWrapper ? <ExtraWrapper>{tree}</ExtraWrapper> : tree
    }

    return {
        queryClient,
        user: userEvent.setup(userEventOptions),
        ...render(ui, { wrapper: Wrapper, ...renderOptions }),
    }
}
