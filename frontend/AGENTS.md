# Commands

- `bun dev` - dev server.
- `bun run build` - production build.
- `bun run typecheck` - fast TypeScript check (`tsc --noEmit`).
- `bun run ci:check` - Biome CI, FSD boundaries, naming, MSW path checks.
- `bun run check` / `bun run check:fix` - local check, with optional safe writes.
- `bun run lint` / `bun run format:fix` - Biome lint or formatting only.
- `bun run test` - Bun unit/integration tests.
- `bun run test:e2e` - Playwright E2E suite.

Run the smallest relevant check first, then broaden when behavior crosses feature,
shared API, routing, or entity boundaries.

# Operating Rules

- Read this file before planning or editing. For scoped areas, read the nearest scoped `AGENTS.md`.
- Keep one intent per change. Do not mix feature work, refactors, formatting churn, and cleanup.
- Prefer security and correctness over speed; be explicit about assumptions, uncertainty, failed checks, and unverified behavior.
- Never revert user changes. Work around unrelated local edits; ask only when they block the task.
- For risky, broad, or architectural work, plan the owner area, likely files, risks, verification, and branch/worktree need before editing.
- Use `codex/<issue-or-task>-<slug>` for Codex-created branches unless asked otherwise.
- Prefer behavioral proof over "tests pass"; do not claim fixed or production-ready without actual verification.
- For TanStack Router or TanStack Start route, navigation, search-param, loader, SSR, or server function questions, verify against installed package docs/types or fetch the official TanStack docs when needed.

# Scoped Instructions

Read these when touching the matching area:

- `src/shared/ui/AGENTS.md` - shared UI primitives and reusable app components.
- `src/shared/config/AGENTS.md` - runtime configuration and environment parsing.
- `src/shared/test/AGENTS.md` - shared test infrastructure, MSW, render helpers.
- `src/features/AGENTS.md` - feature boundaries, ownership, runtime validation.
- `src/features/requests/AGENTS.md` - requests, quotes, send-request, assignment, modals.
- `src/features/chat/AGENTS.md` - conversations, messages, attachments, WebSocket chat state.
- `src/features/organization-branding-settings/AGENTS.md` - branding settings ownership.
- `src/features/organization-business-settings/AGENTS.md` - business settings ownership.
- `src/features/organization-invoice-settings/AGENTS.md` - invoice settings ownership.
- `src/features/quest-assistant/AGENTS.md` - assistant runtime, MobX state, IndexedDB projections, WebSocket updates.

# Verification

- Before declaring code done, run `bun run typecheck` and `bun run ci:check`.
- Run `bun run build` for app behavior, routing, rendering, or dependency changes.
- Run relevant `bun run test` or `bun run test:e2e` coverage for changed behavior.
- Use `bun run check:fix` only when formatting/lint writes are acceptable, then rerun `bun run ci:check`.
- Never declare done while required checks fail. Include the relevant error if a check fails.

# Architecture

Use Feature-Sliced Design v2.1 with only layers that add value here:
`app`, `pages`, `widgets`, `features`, `entities`, `shared`.

Import direction is one-way:

```text
app -> pages -> widgets -> features -> entities -> shared
```

- `src/app/routes` owns every route under TanStack Start file-route conventions: params, search validation, auth/role redirects, route context, server handlers, and page handoff. Public, private, SEO endpoints (`robots.txt`, `sitemap.xml`), and the API proxy catch-all all live there.
- `src/app/model` owns TanStack Start app wiring and route orchestration helpers shared by multiple route files, including the router entry, router context, generated route tree, auth navigation, and workspace session helpers.
- User-visible screen composition belongs in `src/pages/<page>/ui/*` when the screen is established or substantial.
- Features must not import other features. Move shared business concepts to `entities` or technical helpers to `shared`.
- Entities must not import other entities except through explicit `@x` APIs when one entity shape truly references another.
- `shared` must not import app, routes, pages, widgets, features, or entities.
- Do not add source code outside the FSD roots.

# Server State

- Backend data is source of truth; TanStack Query owns cacheable, mutable, or shared server state.
- TanStack Router owns route params, search validation, redirects, route context, and route-only orchestration on every route — via `createFileRoute` and the navigation primitives.
- TanStack Start is the server runtime layered on top of Router: a single Nitro server handles SSR, prerender, server functions (`createServerFn`), and the file-route `server.handlers` (auth, SEO, API proxy) for public and private routes alike.
- If route data represents a server entity also used by TanStack Query, seed/hydrate the query and read from the query in components.
- Do not keep parallel authoritative server-entity copies in `useState`, reducers, context, Zustand, or loader data.
- Local state may hold UI state, selected ids, drafts, optimistic patches, or short-lived snapshots only with explicit resync/rollback.
- After mutations, update or invalidate targeted query keys and revalidate route-owned data only when a route intentionally owns it.
- Organization routes use SSR for stable org context; page-specific data should load client-side through granular TanStack Query zones.

# Files And Folders

- Files and folders are kebab-case by default.
- Route files under `src/app/routes` may use TanStack Start / Router file-route syntax such as `$slug`, `__root`, and `sitemap[.]xml.ts`. Do not put private helper files in the route tree; shared route orchestration belongs in `src/app/model`.
- Public API exceptions: `index.ts` and `index.server.ts`.
- Use dot suffixes only for real boundaries: `.server.ts(x)`, `.client.ts(x)`, `.api.ts`, `.query-options.ts`, `.query-keys.ts`, `.mutation.ts`, `.schema.ts`, `.state.ts`, `.store.ts`, `.types.ts`, `.provider.tsx`, `.context.tsx`, `.page.tsx`, `.config.ts`, `.test.tsx`, `.spec.tsx`, `.factory.ts`.
- UI components keep natural kebab-case: `requests-table.tsx`, not `requests.table.tsx`.
- Avoid generic buckets: no new `components`, `reducers`, `stores`, `types`, `utils`, `helpers`, `constants`, or `data` folders.
- Avoid generic files: no new `types.ts`, `utils.ts`, `helpers.ts`, `constants.ts`, `api.ts`, `mutations.ts`, or `query-keys.ts`.
- Files named `*.api.ts`, `*.query-options.ts`, `*.query-keys.ts`, `*.mutation.ts`, `*.response.ts`, `*.endpoint.ts`, etc. live in the slice `api/` segment.
- Store files that expose a hook use `use-*.store.ts`; class-based stores and pure state/projection modules use domain-named `*.state.ts`.
- App root folders are limited to `api`, `assets`, `config`, `lib`, `model`, `providers`, `routes`, `seo`, `server`, `styles`, `test`.
- Slice root folders use `api`, `model`, `ui`, `lib`, `config`, `server`, `test`; entities may also use `@x`.

# Exports And TypeScript

- Named exports only. The only exception is generated route-tree code (`route-tree.gen.ts`).
- One exported component per file; small internal sub-components are fine.
- No broad barrels. Slice public APIs may exist only at slice roots and must use explicit named re-exports, never `export *`.
- Inside a slice, import sibling modules directly by relative path.
- Prefer direct shared imports such as `@/shared/ui/button` over a large shared barrel.
- Use `interface` for object shapes and `type` for unions, intersections, and mapped types.
- Never use `any`; prefer `unknown` and narrow it.
- Never use `enum`; use string literal unions.

# Runtime Validation

- Validate every runtime boundary with Valibot: API responses, WebSocket messages, localStorage reads, URL params.
- Never use `as Type` on external data; parse with a schema.
- Derive types from schemas via Valibot `v.InferOutput<typeof schema>` for parsed data, or `v.InferInput<typeof schema>` when the pre-parse wire/input shape is needed.
- Feature form schemas live in `features/<x>/model/schemas/`.
- Feature API response schemas live with the owning feature model; response helpers/wrappers use `*.response.ts` in `api/`.
- Shared validation helpers go in `src/shared/lib/validation/`.

# React And UI

- React 19: prefer `use(Context)` over `useContext(Context)`.
- Use `ref` as a regular prop in new app/page/widget/feature/entity code; shared wrappers may keep `forwardRef` for third-party primitives.
- Never define components inside components.
- Use compound components for complex components with many behavior props.
- Providers should expose `{ state, actions, meta }`.
- Boolean props are fine for UI state (`isOpen`, `disabled`, `isLoading`), but avoid boolean behavior variants; create dedicated components.
- Ship meaningful loading, empty, error, disabled, and accessible states where relevant.

# Tests And Reviews

- Before adding tests, search nearby coverage and prefer extending existing behavior, adapter, contract, or regression tests.
- Add a new test only for new observable behavior, a new public contract, or an untested boundary.
- MSW handlers and factories live in the owning slice, not in shared test infrastructure.
- Focus reviews on serious regressions: data/state, security, architecture boundaries, form failure paths, performance, runtime validation, design-system drift, and missing verification.
- Treat AI review comments as candidates, not authority. Fix true positives with root-cause changes and verification.
