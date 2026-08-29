/**
 * Canonical identity strings used across factories and MSW handlers.
 *
 * Why centralized:
 * Auth handlers in `features/auth/api/test/` cannot import from
 * `entities/session/test/` or `entities/organization/test/` (FSD boundary).
 * Without a shared source these strings drift — `createUser()` could return
 * `id: "user-1"` while `authHandlers` returns `sub: "user-2"`, and the
 * mismatch only shows up in route-level integration tests.
 *
 * Place strictly identity-shaped values here only (ids, slugs, display names,
 * emails). Domain shapes (full users, organizations, members, etc.) belong in
 * the slice's own `*.factory.ts`.
 */

export const TEST_USER_ID = "user-1"
export const TEST_USER_NAME = "Ada Lovelace"
export const TEST_USER_EMAIL = "ada@example.test"

export const TEST_ORG_ID = "organization-1"
export const TEST_ORG_NAME = "Acme Logistics"
export const TEST_ORG_SLUG = "acme-logistics"
