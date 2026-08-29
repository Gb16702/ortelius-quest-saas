import { setupServer } from "msw/node"

/**
 * Shared MSW server singleton.
 *
 * Tests opt in via `setupMswServer(...handlers)` from
 * `@/shared/test/setup/msw-server-lifecycle`, or call `server.use(...)` to
 * register per-test handlers. There are no default handlers here on purpose:
 * the FSD shared layer cannot import from features or entities, and bundling
 * a "covers every domain" handler list would force exactly that violation
 * and create the type-drift class we are trying to eliminate.
 *
 * Each slice owns its own handlers under `<slice>/api/test/*-handlers.ts`,
 * derived from the slice's own Valibot schemas via colocated factories.
 */
export const server = setupServer()
