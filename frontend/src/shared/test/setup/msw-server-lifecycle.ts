import { afterAll, afterEach, beforeAll, beforeEach } from "bun:test"
import type { RequestHandler } from "msw"
import { server } from "../msw/msw-server"

/**
 * Wires the MSW server lifecycle into the calling test file.
 *
 * Why a function and not a side-effect import:
 * `bun:test` only honors `beforeAll`/`afterEach`/`afterAll` registered while a
 * `describe` block is currently being constructed. Hooks registered at
 * module-load time from a transitively imported file fire after the file's
 * tests have already run. Calling this helper from inside the test's
 * `describe` keeps the hook in the right scope.
 *
 * Pass the slice's own handlers from `<slice>/api/test/*-handlers.ts`. They
 * are re-applied before each test because `resetHandlers()` clears them.
 * Per-test overrides go through `server.use(...)` and are wiped automatically
 * by `resetHandlers()`.
 */
export function setupMswServer(...initialHandlers: RequestHandler[]): void {
    beforeAll(() => server.listen({ onUnhandledRequest: "error" }))
    if (initialHandlers.length > 0) {
        beforeEach(() => server.use(...initialHandlers))
    }
    afterEach(() => server.resetHandlers())
    afterAll(() => server.close())
}
