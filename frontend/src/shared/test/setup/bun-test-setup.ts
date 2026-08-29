import { afterEach, expect } from "bun:test"
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"
import * as matchers from "@testing-library/jest-dom/matchers"
import { jestDomMatcherUtils } from "./jest-dom-polyfill"

declare module "bun:test" {
    interface Matchers<T> extends TestingLibraryMatchers<T, void> {}
    interface AsymmetricMatchers extends TestingLibraryMatchers<unknown, void> {}
}

// happy-dom must register here, before any test file (and therefore @testing-library/dom)
// loads — testing-library binds to `document` at module-load time and caches a "throw"
// fallback if the global is missing. Late registration cannot un-cache that fallback.
if (typeof window === "undefined") {
    // Snapshot native Fetch + abort primitives before happy-dom overwrites them.
    // happy-dom's Request implementation strips user-set Content-Length on empty
    // bodies (Fetch-spec compliant). Server-runtime code under test (api-proxy)
    // builds Requests with explicit Content-Length to exercise upload guards and
    // needs Bun's native Request, which preserves the header. Restoring the whole
    // Fetch + AbortController/Signal stack keeps Request/signal types consistent
    // for MSW's interceptors, which call `request.signal.addEventListener`.
    //
    // This is a pragmatic workaround. The real fix is to stop relying on
    // Content-Length-on-empty-body in api-proxy (a Fetch-spec violation that
    // happens to work on Bun); see the follow-up issue for that.
    const nativeFetchGlobals = {
        Request: globalThis.Request,
        Response: globalThis.Response,
        Headers: globalThis.Headers,
        fetch: globalThis.fetch,
        FormData: globalThis.FormData,
        Blob: globalThis.Blob,
        File: globalThis.File,
        URL: globalThis.URL,
        URLSearchParams: globalThis.URLSearchParams,
        AbortController: globalThis.AbortController,
        AbortSignal: globalThis.AbortSignal,
    } as const

    GlobalRegistrator.register({ url: "http://localhost/" })

    for (const [key, value] of Object.entries(nativeFetchGlobals)) {
        Object.defineProperty(globalThis, key, {
            value,
            writable: true,
            configurable: true,
            enumerable: true,
        })
    }

    // Guard against silent rot: if a future @happy-dom upgrade ships new
    // Fetch-touching globals or changes how it overwrites them, the next
    // dev should see a loud failure here instead of mysterious test
    // breakage downstream.
    for (const [key, value] of Object.entries(nativeFetchGlobals)) {
        if ((globalThis as Record<string, unknown>)[key] !== value) {
            throw new Error(
                `[bun-test-setup] Failed to restore native ${key} after happy-dom registration. ` +
                    "happy-dom may have changed how it injects globals. " +
                    "Inspect GlobalRegistrator.register() and update the snapshot/restore list."
            )
        }
    }
}

type MatcherContext = { utils?: Record<string, unknown> }
type Matcher = (this: MatcherContext, received: unknown, ...args: unknown[]) => unknown
type MatchersRecord = Record<string, Matcher>

function withJestDomUtils(matcher: Matcher): Matcher {
    return function wrappedMatcher(this: MatcherContext, received, ...args) {
        const mergedUtils = { ...jestDomMatcherUtils, ...(this.utils ?? {}) }
        try {
            Object.defineProperty(this, "utils", {
                value: mergedUtils,
                writable: true,
                configurable: true,
                enumerable: true,
            })
        } catch {
            // If `utils` is non-configurable on this context, fall through and let the
            // matcher run with the original utils. The polyfill is best-effort.
        }
        return matcher.call(this, received, ...args)
    }
}

const wrappedMatchers: MatchersRecord = Object.fromEntries(
    Object.entries(matchers as MatchersRecord).map(([name, matcher]) => [
        name,
        withJestDomUtils(matcher),
    ])
)

expect.extend(wrappedMatchers as Parameters<typeof expect.extend>[0])

const { cleanup } = await import("@testing-library/react")

afterEach(() => {
    cleanup()
})
