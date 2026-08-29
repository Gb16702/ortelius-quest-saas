/// <reference types="vite/client" />
import { QueryClientProvider, useQuery } from "@tanstack/react-query"
import {
    createRootRouteWithContext,
    HeadContent,
    Link,
    Scripts,
    useLocation,
    useMatches,
    useNavigate,
} from "@tanstack/react-router"
import { NuqsAdapter } from "nuqs/adapters/tanstack-router"
import { type ReactNode, useEffect, useRef } from "react"
import { resolveUnauthenticatedRedirectSearch } from "@/app/model/auth-navigation"
import type { TanstackRouterContext } from "@/app/model/router.context"
import appCss from "@/app/styles/globals.css?url"
import { currentSessionQueryOptions } from "@/features/auth"
import {
    defaultLanguage,
    isValidLanguage,
    type SupportedLanguage,
} from "@/shared/lib/i18n/marketing-languages"
import { Button } from "@/shared/ui/button"
import { NotFoundState } from "@/shared/ui/not-found.state"
import { Toaster } from "@/shared/ui/sonner"

export const Route = createRootRouteWithContext<TanstackRouterContext>()({
    head: () => ({
        meta: [
            { charSet: "utf-8" },
            { name: "viewport", content: "width=device-width, initial-scale=1" },
            { title: "Ortelius Quest" },
        ],
        links: [
            { rel: "stylesheet", href: appCss },
            { rel: "icon", href: "/favicon.ico" },
        ],
    }),
    notFoundComponent: RootNotFound,
    shellComponent: RootDocument,
})

function RootDocument({ children }: { children: ReactNode }) {
    const { queryClient } = Route.useRouteContext()
    const matches = useMatches()
    const lang = getDocumentLanguage(matches)

    return (
        <html lang={lang}>
            <head>
                <HeadContent />
            </head>
            <body>
                <QueryClientProvider client={queryClient}>
                    <NuqsAdapter>{children}</NuqsAdapter>
                </QueryClientProvider>
                <Toaster
                    closeButton={false}
                    richColors={false}
                    toastOptions={{
                        classNames: {
                            toast: "success-toast",
                            title: "success-title",
                        },
                    }}
                />
                <Scripts />
            </body>
        </html>
    )
}

function getDocumentLanguage(
    matches: ReadonlyArray<{ params?: unknown; loaderData?: unknown }>
): SupportedLanguage {
    for (const match of [...matches].reverse()) {
        const loaderLang = readLanguage(match.loaderData)
        if (loaderLang) return loaderLang

        const paramLang = readLanguage(match.params)
        if (paramLang) return paramLang
    }

    return defaultLanguage
}

function readLanguage(value: unknown): SupportedLanguage | null {
    if (!value || typeof value !== "object" || !("lang" in value)) return null
    const lang = value.lang
    return typeof lang === "string" && isValidLanguage(lang) ? lang : null
}

function RootNotFound() {
    const isBrowser = typeof window !== "undefined"
    const locationHref = useLocation({ select: (location) => location.href })
    const redirectToRef = useRef(locationHref)
    const hasRedirectedRef = useRef(false)
    const navigate = useNavigate()
    const sessionQuery = useQuery({
        ...currentSessionQueryOptions(),
        enabled: isBrowser,
    })

    useEffect(() => {
        if (!isBrowser || sessionQuery.isPending || sessionQuery.data?.user) return
        if (hasRedirectedRef.current) return

        hasRedirectedRef.current = true

        void navigate({
            replace: true,
            search: resolveUnauthenticatedRedirectSearch(redirectToRef.current),
            to: "/sign-in",
        })
    }, [isBrowser, navigate, sessionQuery.data?.user, sessionQuery.isPending])

    if (!isBrowser || sessionQuery.isPending || !sessionQuery.data?.user) {
        return (
            <main className="flex min-h-dvh items-center justify-center bg-ds-surface px-6 text-ds-fg">
                <p className="text-ds-fg-muted text-sm">Loading...</p>
            </main>
        )
    }

    return (
        <main className="flex min-h-dvh items-center justify-center bg-ds-surface px-6 text-ds-fg">
            <NotFoundState>
                <Button asChild variant="outline" size="sm" radius="full">
                    <Link to="/" preload={false}>
                        Go home
                    </Link>
                </Button>
            </NotFoundState>
        </main>
    )
}
