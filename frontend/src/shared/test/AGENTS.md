# Shared Test Infrastructure

This folder owns the cross-cutting testing toolchain only:

- `bun:test` preload (`setup/`)
- the DOM environment (`@happy-dom/global-registrator`)
- jest-dom matchers wired into bun's `expect`
- the `renderWithProviders` helper and the test query client factory (`render/`)
- the MSW server singleton and its lifecycle helper (`msw/` + `setup/msw-server-lifecycle.ts`)
- the canonical identity strings (`fixtures/identity.ts`) used by both factories and MSW handlers, so an auth handler and a user factory cannot drift apart on `id`/`email`/`slug`

It does **not** own factories, handlers, or fixtures. Those live next to the schema or endpoint they mirror, inside the owning entity or feature slice.

## Stack

- `bun:test` is the runner (existing convention; do not introduce vitest/jest).
- `happy-dom` provides the DOM globals via `@happy-dom/global-registrator`, registered once in the preload.
- `@testing-library/react` + `@testing-library/user-event` for component interaction.
- `@testing-library/jest-dom` matchers are merged into the bun `expect` global.
- `nuqs/adapters/testing` provides URL search-param state in tests.
- `msw` intercepts HTTP at the network layer. Tests must not stub `fetch` directly going forward.

## E2E tags

- `@smoke` marks happy-path Playwright checks that must be cheap enough for every PR.
- `@critical` marks Playwright business flows that revenue, security, or trust depend on.
- Untagged Playwright specs are reserved for broader nightly or manual E2E runs.

## Folder layout

```
src/shared/test/
├── setup/      # bun:test preload + setupMswServer lifecycle helper
├── render/     # renderWithProviders + test QueryClient
├── factories/  # cross-slice factories if any; most factories live in their owning slice
├── msw/        # MSW server singleton (no default handlers)
└── fixtures/   # canonical identity strings shared across factories + handlers
```

The `bunfig.toml` at repo root preloads `src/shared/test/setup/bun-test-setup.ts` for every `bun test` invocation. The preload does only what every test needs cheaply:

- registers happy-dom (`http://localhost/` as base URL) — must happen before any test imports `@testing-library/dom`, which binds to `globalThis.document` at module-load time and caches a "throw" fallback if the global is missing
- extends bun's `expect` with jest-dom matchers, each wrapped to inject the `MatcherState.utils` surface jest-dom expects (`EXPECTED_COLOR`, `matcherHint`, `stringify`, etc.) — without this polyfill, a failing jest-dom assertion crashes the failure formatter with `context.utils.EXPECTED_COLOR is not a function` instead of producing a readable error

MSW lifecycle is **opt-in** per test file via `setupMswServer(...handlers)` (see "MSW" below). It is not in the preload because `bun:test` only honors top-level `beforeAll`/`afterEach`/`afterAll` registered while a `describe` is being constructed; hooks registered from a transitively imported module fire after the file's tests have already run.

## renderWithProviders

`renderWithProviders` (in `render/render-with-providers.tsx`) is the only sanctioned way to mount a component in a test. It wraps the UI in `QueryClientProvider`, a TanStack memory router context, and `NuqsTestingAdapter` — matching the TanStack Start shell mounted at runtime.

```tsx
import { renderWithProviders } from "@/shared/test/render/render-with-providers"

const { queryClient, user } = renderWithProviders(<MyComponent />, {
    routerProps: { initialEntries: ["/org/acme/requests"] },
    nuqsProps: { searchParams: { tab: "open" } },
})

await user.click(screen.getByRole("button", { name: /save/i }))
```

- `queryClient` — pass your own only when a test needs to seed cache state before the first render. The returned `queryClient` is the one mounted in the tree; use it to inspect cache state or assert invalidations.
- `routerProps` — control the initial location, history stack, or `initialIndex`.
- `nuqsProps` — seed initial URL search params (`{ filter: "active" }`) or attach an `onUrlUpdate` spy to assert URL writes.
- `extraWrapper` — wrap the providers with an additional component (e.g. `Toaster` for sonner-driven flows). Opt in only when the component under test relies on it.
- `userEventOptions` — passed through to `userEvent.setup()`.
- `user` — the result of `userEvent.setup()`, returned for convenience so tests do not have to call setup themselves.

`createTestQueryClient` configures `retry: false`, `gcTime: Infinity`, `staleTime: Infinity`, and a `QueryCache` whose `onError` is a noop. Tests never wait on retries, cache state survives re-mounts (so `rerender(...)` does not silently refire `queryFn` against MSW), and intentionally-failed queries do not pollute the runner output with unhandled-error logs.

## Factories live in the owning slice

Factories produce a single realistic instance of an entity with `Partial<T>` overrides. They live with the schema they mirror, **not** in this folder:

| Factory | Location |
|---|---|
| `createUser` | `src/entities/session/model/test/user.factory.ts` |
| `createOrganization` | `src/entities/organization/model/test/organization.factory.ts` |
| `createMember` | `src/entities/member/model/test/member.factory.ts` |
| `createCurrentSubscription` / `createMarketingSubscription` | `src/entities/subscription/model/test/*.factory.ts` |
| `createRequest` / `createRequestDetail` / `createQuote` | `src/features/requests/model/test/*.factory.ts` |
| `createConversation` / `createMessage` | `src/features/chat/model/test/*.factory.ts` |

Each factory imports its schema directly via a relative path inside the slice. Identity-shaped values (user id, org slug, etc.) come from `@/shared/test/fixtures/identity` so the factory and any matching MSW handler agree on those strings without an FSD-violating cross-slice import.

### `v.InferInput` vs `v.InferOutput`

The factory output type is derived from the slice's local schema. Pick the shape that gives the most useful type help:

- **`v.InferInput<typeof schema>`** is the wire-format shape. Use it for plain `v.object({...})` schemas and for schemas whose top-level `v.transform` only normalizes existing fields. Defaults make the matching fields optional in the factory's `Partial<T>`, but the factory still provides them so `parseSchema(schema, factory())` succeeds.
- **`v.InferOutput<typeof schema>`** is the post-parse shape. Use it when `v.InferInput` collapses to `unknown` or when reading the input shape costs more than it gives — e.g. a transform that adds computed fields where you want IDE help on the consumer-facing shape.

There is no single right answer, but a single rule per file: every factory in this repo follows the choice above, and each colocated `*-factory.spec.ts` runs `schema.parse(factory())`. **The contract spec is the source of truth, not the type alias** — when in doubt, run the parse and trust the failure.

## MSW handlers live in the owning slice

Handlers mock HTTP endpoints owned by a slice. They live in `<slice>/api/test/*-handlers.ts`:

| Handler | Location |
|---|---|
| `authHandlers` | `src/features/auth/api/test/auth-handlers.ts` |
| `organizationHandlers` | `src/entities/organization/api/test/organization-handlers.ts` |
| `membersHandlers` | `src/entities/member/api/test/members-handlers.ts` |
| `subscriptionHandlers` | `src/entities/subscription/api/test/subscription-handlers.ts` |
| `requestsHandlers` / `catalogHandlers` | `src/features/requests/api/test/*-handlers.ts` |
| `chatHandlers` | `src/features/chat/api/test/chat-handlers.ts` |
| `invoicesHandlers` | `src/features/organization-invoice-settings/api/test/invoices-handlers.ts` |

Each handler module has a colocated `*-handlers.spec.ts` that issues a `fetch` against the mocked endpoint and parses the response through the actual consumer schema. This is a **contract test** — it catches the entire class of bugs where a handler returns a shape that does not match the runtime parser (envelope mismatch, wrong field types, missing required fields).

### Contract drift debt — must read

There is **no shared REST contracts package between front and back** (see epic #459). Every handler URL and response shape is hand-written against what we believe the backend exposes. Two failure modes are possible:

1. The handler path does not match the path the production code actually requests. A contract spec that fetches the handler's own path passes, while a real component test that exercises the production query hits an "unhandled request" error from MSW.
2. The handler response shape passes its contract spec but drifts from the backend response over time.

**Mandatory checklist when adding or modifying a handler:**

- [ ] Grep the production code for the **exact path string** you mock and confirm there is at least one match. Use `rg "<path>" src/<slice>/api` — not just the handler's own folder. If no match, your handler is dead code.
- [ ] If the production code computes the URL (template literals, `joinUrl(...)`, `${API_URL}/...`), reproduce the same composition in your head and write the resolved path the handler should match.
- [ ] Import the **real consumer schema** in the contract spec (e.g. `import { userSchema } from "../user.schema"`), not a local copy or duplicated `v.object`. The spec must call `parseSchema(realSchema, await response.json())`.
- [ ] If the production fetch hits an **absolute URL** (`${AUTH_URL}/auth/me`, `${API_URL}/...` resolved at runtime), MSW Node mode only intercepts that absolute URL — a relative `http.get("/auth/me", ...)` will not match. Either inline `server.use(http.get(absoluteUrl, ...))` in the test or document the gap in the handler module's top comment.
- [ ] When the backend endpoint changes, the handler is updated in **the same PR** as the production fetch. Reviewers must reject backend-contract PRs that leave handlers stale.

Failure mode (1) is now enforced automatically. `bun run check:msw-paths` (run as part of `bun run check` and `bun run ci:check`) scans every `*-handlers.ts` and fails when an `http.<method>("<path>", ...)` literal has no matching production fetch in the owning slice's `api/*.ts` files (excluding `api/test/**`). For endpoints behind an absolute URL intercepted via inline `server.use(http.get(absoluteUrl, ...))`, silence the warning with `// msw-allow-orphan: <reason>` on the call line or the line directly above it.

To mitigate (2), when the OpenAPI infra ships (see epic #459), we will add a periodic audit script that diffs handlers against the generated client. Until then, treat handler-response drift as a known risk.

## MSW server

`src/shared/test/msw/msw-server.ts` exports the `server` singleton with **no default handlers**. Tests opt in to the lifecycle via `setupMswServer(...handlers)` from `@/shared/test/setup/msw-server-lifecycle`:

```ts
import { setupMswServer } from "@/shared/test/setup/msw-server-lifecycle"
import { requestsHandlers } from "@/features/requests/api/test/requests-handlers"
// inside features/requests this would be a relative import.

describe("RequestsList", () => {
    setupMswServer(...requestsHandlers)
    // every test in this describe gets requestsHandlers, plus any per-test overrides.

    it("...", () => { ... })
})
```

`setupMswServer(...handlers)` registers `server.listen({ onUnhandledRequest: "error" })`, re-applies the passed handlers in `beforeEach` (so per-test `server.use(...)` overrides do not bleed into the next test), `server.resetHandlers()` after each test, and `server.close()` at the end. Calling `setupMswServer()` with no arguments still enables the lifecycle — useful for tests that only use inline `server.use(...)` overrides.

**Always go through `setupMswServer`.** Do not hand-roll `beforeAll(server.listen)` / `afterEach(server.resetHandlers)` / `afterAll(server.close)` inline in spec files — that copy-paste is exactly the source of drift the helper exists to prevent. If you need different lifecycle semantics for one spec, change the helper, don't inline a parallel one.

Tests that do not call `setupMswServer()` are unaffected by MSW — useful for the existing pure-logic tests that mock `globalThis.fetch` directly.

To override per-test, call `server.use(...)` with a `http.method(...)` handler:

```ts
import { http, HttpResponse } from "msw"
import { server } from "@/shared/test/msw/msw-server"

server.use(
    http.get("/api/requests", () => HttpResponse.json({ data: { requests: [], pagination: { total: 0, page: 1, limit: 20, totalPages: 0 } } })),
    http.post("/api/requests/:id/assign", () => HttpResponse.json({ success: true })),
)
```

Because `onUnhandledRequest: "error"` is set, **any unmocked request fails the test** — there is no silent network leak. If a test starts failing with an "unhandled request" error, add a handler for that endpoint either in the matching slice's `*-handlers.ts` (if it should be a default for that slice) or via `server.use(...)` in the test (if it is test-specific).

Do not bring back `globalThis.fetch = ...` patterns once a test is on MSW. Per-test overrides go through `server.use(...)`, and `afterEach` cleans them up automatically.

### Cross-slice handler composition

A test in `features/X` cannot import handlers from `features/Y` — the FSD boundary check rejects cross-feature imports. If your test needs to mock multiple features' endpoints, that test belongs at a layer that legitimately composes them, such as an app-route integration spec under `src/app/routes/` or a page-level spec under `src/pages/<page>/test/`. At those layers the route or page can import handlers from any slice through their `api/test/*` paths inside its own boundary; for cross-slice composition prefer inline `server.use(http.get(...))` to avoid taking a hard dependency on another slice's test code.

## File naming

This folder lives under `src/shared/`, which the source-naming guard treats as a technical code segment. Stick to:

- kebab-case for every directory and file
- `*.factory.ts` for entity factories (e.g. `user.factory.ts`)
- `*-handlers.ts` for MSW handler modules (`handlers` is not in the project's allowed dot-suffix list, so use a hyphen)
- `*-factory.spec.ts` and `*-handlers.spec.ts` for the colocated contract tests (the dot-suffix guard does not allow `*.factory.spec.ts`)
- `*.test.ts(x)` or `*.spec.ts(x)` for tests colocated next to a helper

## Placement convention

- Tests for production code stay colocated with their slice in the nearest `test/` folder, using `*.spec.ts(x)`.
- Tests that exercise shared infrastructure itself (e.g. `renderWithProviders`) live next to the helper using `*.test.tsx`.

## Anti-slop rules

- Do not call `GlobalRegistrator.register()` more than once. The preload already does it.
- Do not import from `app`, `pages`, `widgets`, `features`, or `entities` from this folder. The FSD boundary check rejects it. That is exactly why factories and handlers live in the owning slices instead of here.
- Do not bring back hand-rolled `globalThis.fetch = ...` patterns once MSW is in place. Per-test overrides go through `server.use(...)`.
- Do not re-introduce a "default handlers" list that aggregates every domain. It encourages tests to assume realistic data they did not set up themselves and forces the FSD violation we just removed.
- Do not skip `renderWithProviders` for component tests. Tests that mount components without the standard provider tree drift away from production behavior.
- Do not duplicate identity strings (`"user-1"`, `"acme-logistics"`, `ada@example.test`). Reference `@/shared/test/fixtures/identity` instead — even from MSW handlers that cannot import factories due to FSD boundaries.
- Do not inline the MSW lifecycle (`beforeAll(server.listen)` / `afterEach(server.resetHandlers)` / `afterAll(server.close)`). Always call `setupMswServer(...)`.

## Native Fetch in tests

`bun-test-setup.ts` snapshots Bun's native `Request`, `Response`, `Headers`, `fetch`, `FormData`, `Blob`, `File`, `URL`, `URLSearchParams`, `AbortController`, and `AbortSignal` before `GlobalRegistrator.register()` runs, then restores them after. happy-dom's `Request` strips user-set `Content-Length` on empty bodies (Fetch-spec compliant); api-proxy server-runtime tests rely on Bun's permissive behavior and break under happy-dom's. The full Fetch + abort stack must be restored together so MSW's interceptors see consistent Request/AbortSignal types.

This is a workaround. The real fix is to remove api-proxy's reliance on `Content-Length`-on-empty-body. A runtime guard inside the preload throws if the snapshot/restore fails — if it ever fires after a happy-dom upgrade, inspect `GlobalRegistrator.register()` and update the snapshot list rather than silencing the guard.

## Coverage thresholds

`bunfig.toml` enforces 60% line/function/statement coverage as a starting floor. The number is intentionally conservative — its job is to prevent regression while we ratchet it up as the new factories and handlers grow consumer tests.
