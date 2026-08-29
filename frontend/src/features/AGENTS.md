# Feature Boundaries

Features own business UI, state, queries, mutations, schemas, and public domain types.

Default structure:

```text
api/
model/
model/hooks/
model/schemas/
ui/
lib/
config/
server/
test/
index.ts
index.server.ts
```

Create optional segments only when the feature actually needs them. Do not add
`types/`, `constants/`, `utils/`, `helpers/`, `stores/`, or `reducers/`
folders; keep types in domain-named model files, constants in precise
domain-named files, hook-based stores as `use-*.store.ts`, class-based stores
or pure state/projection modules as `<domain>.state.ts`, and reducers as
`<domain>.reducer.ts`.

If a feature intentionally uses a different state architecture, such as a MobX
class store with a local projection log, add or update a scoped `AGENTS.md`
inside that feature and treat it as the source of truth before applying generic
feature rules.

Providers live in `model/`, prefer `{ state, actions, meta }`, and are surfaced through the feature public API only when another layer needs them.

Keep routes thin: route modules perform framework work and normally hand off to page slices. Page slices, widgets, or app providers compose feature providers and feature components; feature files own behavior.

Do not create cross-feature imports. If a feature needs another feature's UI, hook, or service, first decide whether the shared part belongs in `src/shared/ui`, `src/shared/lib`, `src/entities`, route/widget composition, or a new explicit integration boundary.

External layers import a feature only through its public API: `@/features/<feature>` for client-safe exports and `@/features/<feature>/index.server` for server-only exports. Inside the feature, use relative imports between sibling modules instead of importing from the public API.

Runtime boundaries use Valibot schemas. API responses, URL params, localStorage, and WebSocket payloads must be parsed before being trusted.

Avoid duplicating domain rendering. Before adding a badge, status display, table column, or dialog, search the feature for an existing one.

Feature tests follow the existing scoped test folder pattern. Place tests in the
nearest owning segment's `test/` folder and use `*.spec.ts(x)` filenames, such
as `api/test/requests.spec.ts`, `model/test/checkout.spec.ts`, or
`lib/test/request-chat-recipient.spec.ts`.
