# E2E test suite (Playwright)

This folder owns the end-to-end test suite. It sits **outside** the FSD tree
(no `src/`) because E2E specs cut across every layer — they exercise the real
browser against the real frontend wired to a real (or contract-realistic)
backend.

Unit, component, contract and integration tests live next to the slice they
exercise, in `src/<layer>/<slice>/<segment>/test/`. Do not add those here.

## What lives here

- `*.spec.ts` — Playwright specs, one user journey per file.
- `helpers/` — shared spec helpers (page-objects, action sequences). Helpers
  cannot import from `src/` — E2E specs treat the app as a black box.
- `fixtures/` — typed Playwright fixtures (auth state, role-scoped pages).
  Added in Phase 5 issue #477.
- `.auth/` — pre-authenticated storage states for `admin`, `member`, `guest`,
  produced by a global setup script. **Gitignored.** Added in #477.

## Conventions

### Tags

- `@smoke` — happy-path-only flows that must pass on every PR. Run with
  `bun run test:e2e -- --grep @smoke`.
- `@critical` — business flows that revenue, security, or trust depend on
  (requests creation, quote acceptance, chat send, member invite, plan
  change). Run on every PR.
- Untagged specs run only in nightly.

### File naming

- `<domain>-<flow>.spec.ts`, kebab-case (existing convention: `voip-happy-path.spec.ts`).
- One coherent user flow per file. Multiple `test()` calls inside are fine
  when they share setup; otherwise split.

### Web-first assertions only

- Use Playwright's auto-waiting locators and `expect(locator).toHaveText(...)`
  / `toBeVisible()` / `toHaveURL(...)` style.
- **Never `page.waitForTimeout(ms)`.** Wait on an observable state change.
- **Never assert on CSS classes.** Assert on roles, labels, visible text.

### Network

- Production-realistic backend by default. For flows that exercise external
  side-effects (Stripe, real email), mock with `page.route(...)`.
- MSW is **not** used here — Playwright has its own request interception
  layer (`page.route`). The MSW handlers in `src/<slice>/api/test/*-handlers.ts`
  are for the unit/component test runtime only.

## Prerequisites (current VoIP suite)

The existing VoIP specs need:

1. Backend at `http://localhost:3000` (or set `VITE_API_URL`).
2. Frontend dev server at `http://localhost:5173` (or set `PLAYWRIGHT_BASE_URL`).
3. Two seeded users in the same conversation `conv_e2e_test`:
   - `e2e-caller@test.local` / `e2e-test-password`
   - `e2e-callee@test.local` / `e2e-test-password`
4. Browsers: `bunx playwright install chromium`.

The role fixtures from #477 provide deterministic admin/member/guest storage
states for the business-flow suites. The current VoIP specs still rely on the
seeded caller/callee users above until they are migrated.

## Run

```bash
bun run test:e2e                     # headless, all tagged + untagged
bun run test:e2e -- --grep @smoke    # smoke only (CI default)
bun run test:e2e:headed              # headed, for debugging
```

If a test hangs at "Connecting..." in the VoIP suite, run with `--debug` and
check the page console for ICE failures (likely no TURN server in the test
env — fake media streams + permissive autoplay are usually enough for direct
P2P).

## What's covered today

VoIP (existing):

- `voip-happy-path.spec.ts` — A calls B, B accepts, audio bytes flow both ways
- `voip-decline.spec.ts` — A calls B, B declines, both UIs reset
- `voip-end-call.spec.ts` — Both connected, A hangs up, B sees end
- `voip-mute.spec.ts` — mute toggle visible to peer
- `voip-double-call.spec.ts`, `voip-five-calls.spec.ts`,
  `voip-min-max.spec.ts`, `voip-network-chaos.spec.ts`,
  `voip-org-call.spec.ts`, `voip-real-ui.spec.ts`,
  `voip-smoke.spec.ts` — stress, concurrency, network, regression scenarios.

Phase 5 of epic #459 adds:

- `auth.spec.ts` — sign-in, post-auth redirect, protected-route access (#478)
- `requests.spec.ts` — create → quote → assign (#479)
- `chat.spec.ts` — send → edit → delete with two browser contexts (#480)
- `members.spec.ts` — invite → role change (#481)
- `subscription.spec.ts` — plan change with mocked Stripe (#482)

## Anti-slop rules

- One spec, one coherent user flow. Specs that test six unrelated things
  fail-stop on the first issue and obscure the rest.
- No `page.waitForTimeout`. No CSS-class assertions. No flaky `Promise.race`
  patterns. If a test is flaky, fix the cause; do not retry.
- No real Stripe charges. No real emails sent. Mock side-effects at the
  network layer via `page.route(...)`.
- Storage states are pre-baked once per run by the global setup. Do not
  sign in inside individual specs.
- E2E specs cannot import from `src/`. If a helper needs to share a constant
  with prod code, that constant belongs in `src/shared/config/` (publicly
  exported) and the spec re-declares it — not the reverse.
