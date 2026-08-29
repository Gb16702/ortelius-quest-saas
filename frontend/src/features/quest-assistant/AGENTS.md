# Quest Assistant Feature

Read this after the root `AGENTS.md` and `src/features/AGENTS.md` before
touching `src/features/quest-assistant`.

This feature owns the assistant entry point, conversation projection state,
assistant actions, attachment selection/library behavior, prompt submission,
optimistic updates, IndexedDB-backed realtime projection persistence, and
assistant WebSocket event application.

The target product feel is Linear-like: fast, optimistic, direct, and resilient
to refreshes or reconnects. Prefer immediate local feedback with clear rollback
over waiting for round trips. Do not add compatibility paths, polling, or
secondary caches unless there is a concrete product or data-retention reason.

`model/quest-assistant.state.ts` is the in-memory UI source of truth for
assistant conversations, conversation projections, actions, attachment library
state, streamed titles, and loading/error flags. It is a MobX class store by
design; do not convert it to `use-*.store.ts` just to match hook-store naming.
Pure projection helpers may also use domain-named `*.state.ts` files when they
do not expose React hooks.

React state in `ui/quest-assistant-entry.tsx` should stay limited to local UI
controls and lifecycle coordination: open dialogs, composer draft, selected
conversation id, pending optimistic ids, upload state, streaming flags, and
refs. Do not mirror conversations, projections, actions, or attachment library
data in React state when the MobX store already owns it.

`model/quest-assistant-realtime-log.client.ts` owns the IndexedDB event log and
durable projection. Treat it as a local projection source for refresh/reconnect
recovery, duplicate filtering, sync-gap recovery, prompt projections, and
deletion tombstones. IndexedDB writes must not block live UI updates; every
caller should handle unavailable or failed persistence explicitly.

Assistant WebSocket payloads are sync notifications, not the durable source of
truth. Parse them through `parseQuestAssistantSyncAvailableMessage`, call the
assistant sync endpoint after the local `lastSyncId`, then apply returned sync
actions through `recordAndApplyQuestAssistantSyncActions` so persistence,
ordering, deletion tombstones, and current-chat filtering stay consistent. Use
the shared WebSocket transport from `src/shared/api/websocket`; do not introduce
a second assistant transport or polling loop for behavior already covered by
sync recovery.

Optimistic message, conversation, favorite, action, and deletion flows must have
a single rollback/reconciliation path. When a temporary id is replaced by a
server id, reconcile the MobX store and IndexedDB projection together. Avoid
parallel UI sources of truth such as duplicated TanStack Query caches, loader
data, React reducers, or localStorage mirrors for the same assistant projection.

Runtime boundaries use Valibot. API responses, WebSocket events, IndexedDB
records, URL search params, and localStorage-like persisted data must be parsed
before trust. Derive schema-backed types with `v.InferOutput<typeof schema>` or
`v.InferInput<typeof schema>` as appropriate.

Keep the public API narrow. Export only the entry component and explicit
integration helpers from `index.ts`; widgets, pages, and app code should import
assistant behavior through `@/features/quest-assistant`, not internal files.

Verification for assistant changes should cover the changed behavior, not just
types. Prefer the nearby model tests for realtime parsing, event queue,
IndexedDB projection, optimistic deletion, URL state, and API contracts. For UI
flow changes, add or update focused component tests where practical, then run
`bun run typecheck` and `bun run ci:check` before declaring the work complete.
