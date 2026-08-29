# Ortelius Quest Frontend

React 19 frontend for Ortelius logistics workflows. The app covers public
marketing pages, authentication entry points, organization showcase pages,
personal workspaces, organization-scoped operations, requests, quotes, chat,
VoIP, settings, billing, invoices, and legal documents.

This README describes the current frontend only. The codebase has
organization-scoped routes, roles, and cache keys, but isolation and
authorization are backend concerns enforced through the authenticated
API/session model.

## Product Surface

- Public marketing and checkout routes under `/:lang/*`
- Legal pages, sitemap, robots, and Open Graph image routes
- Auth routes for sign-in, sign-up, email verification, logout, and post-redirect
- Public organization showcase route at `/org/:slug`
- Personal app area under `/me/*` for account, requests, chats, and conversations
- Organization-scoped app area under `/org/:slug/*` for dashboards, team,
  requests, chats, and settings
- Runtime shell for WebSocket connection, notifications, unread chat state,
  presence, and VoIP call UI

## Stack

- Bun workspace with the app plus `packages/*`
- React 19 and TypeScript
- Vite 8 and Tailwind CSS v4
- TanStack Start as the unified server (Nitro-based SSR, prerender, server functions) on top of TanStack Router for file routes, navigation, and route context
- TanStack Query for server state
- nuqs for URL state
- Zustand only for small client-only shared state such as presence, VoIP, and
  persisted request drafts
- Valibot for runtime validation at API, environment, storage, WebSocket, and route
  boundaries
- Biome for linting and formatting
- Playwright for end-to-end tests
- Stripe, Google Maps, Umami, WebSocket, and WebRTC integrations when configured

## Prerequisites

- Bun 1.2 or newer
- Access to the backend API and auth endpoints used by your environment
- A local `.env` file based on `.env.example`

## Setup

Install dependencies:

```bash
bun install
```

Create local environment configuration:

```bash
cp .env.example .env
```

Start the development server:

```bash
bun run dev
```

The Vite dev server is configured on [http://localhost:5174](http://localhost:5174).

## Environment

Server-only values are parsed through `src/shared/config/env.server.ts`.
Browser-safe values are parsed through `src/shared/config/env.ts` and must use
the `VITE_*` prefix.

| Variable | Used for |
| --- | --- |
| `NODE_ENV` | Server runtime mode |
| `APP_ORIGIN` | Public origin of this frontend |
| `AUTH_URL` | Auth service base URL |
| `LOGIN_URL` | External login URL |
| `API_URL` | Server-side backend API URL |
| `VITE_API_URL` | Browser-visible backend API URL |
| `VITE_WS_URL` | Browser-visible WebSocket URL |
| `VITE_PORTAL_ACCOUNT_URL` | External account portal URL |
| `VITE_UMAMI_URL` | Optional Umami script URL |
| `VITE_UMAMI_WEBSITE_ID` | Optional Umami website id |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key only |
| `VITE_GMAPS_KEY` | Google Maps browser key |

Never put private service credentials in `VITE_*` variables; they can be bundled
into browser code.

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Start the TanStack Start dev server (Vite + Nitro) on port 5174 |
| `bun run build` | Build the TanStack Start app: client bundle, prerendered public pages, server bundle, robots, and sitemap |
| `bun run start` | Run the production server from `.output/server/index.mjs` under Bun |
| `bun run typecheck` | Run fast TypeScript checking with `tsc --noEmit` |
| `bun run test` | Run Bun tests in `src` and `packages` |
| `bun run lint` | Run Biome lint checks |
| `bun run lint:fix` | Apply Biome lint fixes |
| `bun run format` | Check Biome formatting |
| `bun run format:fix` | Apply Biome formatting |
| `bun run check:boundaries` | Check Feature-Sliced Design import boundaries |
| `bun run check:naming` | Check source file and folder naming rules |
| `bun run check` | Run Biome, boundary, and naming checks locally |
| `bun run check:fix` | Apply Biome fixes, then run boundary and naming checks |
| `bun run ci:check` | Run CI-style Biome, boundary, and naming checks without writes |
| `bun run test:e2e` | Run Playwright tests |
| `bun run test:e2e:headed` | Run Playwright tests with a visible browser |
| `bun run test:e2e:debug` | Debug Playwright tests |

`prepare` runs `husky || true` during install and is not usually invoked
manually.

## Verification

Run the smallest relevant check first while developing. Before declaring a
frontend change done, use the checks that match the changed behavior:

```bash
bun run typecheck
bun run ci:check
```

For app behavior, routing, rendering, dependency, or public asset changes,
also run:

```bash
bun run build
```

For behavior covered by browser tests, run the focused Playwright target or:

```bash
bun run test:e2e
```

For unit and integration coverage in `src` and `packages`, run:

```bash
bun run test
```

## Architecture

The project follows Feature-Sliced Design v2.1.

```text
src/
|-- app/       # app setup, TanStack Start route runtime, providers, styles, SEO helpers
|-- pages/     # route-level screen composition
|-- widgets/   # large reusable layout blocks
|-- features/  # user-valued workflows and business interactions
|-- entities/  # shared business entities and explicit public APIs
`-- shared/    # technical APIs, config, libraries, tests, and UI primitives
```

Import direction flows downward:

```text
app -> pages -> widgets -> features -> entities -> shared
```

Routes should stay thin: route params, search validation, redirects, metadata,
and layout wiring belong in `src/app/routes`. Route orchestration helpers
shared by multiple routes belong in `src/app/model`; visible screen composition
belongs in `src/pages`; domain behavior belongs in the owning feature or entity.

## State Ownership

- Backend data is server state and should be owned by TanStack Query once it is
  cacheable, mutable, or shared.
- TanStack Router owns route params, search validation, redirects, route
  context, and route-only orchestration on every route, public or private —
  via `createFileRoute` and the navigation primitives (`Link`, `useNavigate`,
  `getRouteApi`).
- TanStack Start owns the runtime that wraps Router: the Nitro server,
  SSR/prerender, and server functions (`createServerFn`, plus the
  `server.handlers` block on each file route for auth, SEO, and the API
  proxy). One server serves both public marketing and private dashboard
  routes.
- URL state owns shareable filters, search, selected tabs, pagination, sort, and
  reloadable wizard steps.
- Local React state owns mounted-session UI state.
- Zustand is reserved for client-only state shared across components when URL
  state and TanStack Query are the wrong owner.
- Persisted client state must be validated, versioned, partial, and explicitly
  cleared or expired.

## Organization Data Loading Pattern

Organization routes use SSR only for stable route context: authenticated
session, organization identity, organization role, route redirects, metadata,
and layout state. The organization layout provides that context once, and it
stays available while navigating inside `/org/:slug/*`.

Page-specific data should load on the client with TanStack Query, even when the
data is important for the first useful paint. Pages should avoid one monolithic
loading gate. Instead, split the screen into functional zones, let each zone own
its query priority, and render a skeleton that matches that zone's final shape.
Critical zones should start fetching as soon as the page mounts. Secondary
zones, heavy controls, editors, modals, and rarely used actions may be lazy
loaded or deferred after the primary content is interactive.

Navigation should use cache warming and intent prefetching where it improves
subsequent navigation. Sidebar links and action triggers can prefetch on hover,
focus, pointer intent, or other early interaction. Once data is fetched, reuse it
through TanStack Query cache keys with explicit organization/user/filter scope,
stale-state handling, refetch behavior, and targeted invalidation after
mutations.

Lazy UI must preserve interaction feedback. Buttons and navigation items should
render immediately when permission is already known from the organization
layout. If a lazy action is opened before its chunk is ready, mount the stable
dialog/sheet shell immediately and put `Suspense` inside that shell so only the
lazy body shows a localized skeleton. Do not replace the button with a skeleton,
do not block page rendering behind action chunks, and do not use a second fake
dialog as the fallback for the real dialog.

## Repository Notes

- App code uses named exports by default. Generated route-tree code may use
  its required export shape.
- New source files and folders use kebab-case by default.
- Public slice APIs use explicit named re-exports only; do not add broad barrels.
- Runtime boundaries should be validated with Valibot instead of unsafe casts.
- The local WebSocket contract package lives in `packages/websocket-types`.

## References

- [TanStack Start](https://tanstack.com/start/latest)
- [TanStack Router](https://tanstack.com/router/latest)
- [TanStack Query](https://tanstack.com/query/latest)
- [Tailwind CSS](https://tailwindcss.com/)
- [Biome](https://biomejs.dev/)
- [Playwright](https://playwright.dev/)
