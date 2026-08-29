# Quest Assistant TanStack AI Plan

## Product Decision

Build Quest Assistant as a global assistant for authenticated Quest users.

- Entry point: `Ask Quest` button in the private app topbar.
- Primary UI: minimal floating dialog, inspired by Linear.
- Mobile UI: fullscreen dialog.
- No user-facing model picker.
- Assistant responses must be in English.
- Conversation history is persisted from the first backend version.
- The first implementation is backend-first, then a minimal frontend shell.

## Technical Direction

- Backend runtime: Hono in `quest-saas-api`.
- AI orchestration: TanStack AI with the OpenAI adapter.
- Model/provider choice remains server-owned.
- OpenAI API keys never leave the backend.
- Quest auth, permissions, plan gating, rate limits, storage, audit logs, and tool execution remain owned by Quest backend code.
- TanStack AI is used as the AI runtime layer, not as the product architecture.

## Phase 0 - Branch And Planning

- [x] Create matching frontend/backend branch: `codex/quest-assistant-tanstack-ai`.
- [x] Persist this long-term plan in Markdown.
- [x] Keep this file updated as implementation decisions change.

## Phase 1 - Backend Foundation

Goal: create a testable assistant API before building the UI.

- [x] Add `@tanstack/ai` and `@tanstack/ai-openai` to the backend.
- [x] Create domain folder: `src/domains/assistant`.
- [x] Add assistant routes under `/api/assistant`.
- [x] Add request/response schemas with Zod.
- [x] Add server-owned model config.
- [x] Add an assistant service that can return a streamed response.
- [x] Enforce English-only assistant behavior in server instructions.
- [x] Add assistant personality and behavior rules inspired by proven product-agent prompts.
- [x] Normalize assistant errors to existing Quest API error format.
- [x] Add backend tests for auth, validation, and basic response behavior.

## Phase 2 - Persistence

Goal: preserve conversation history from the first usable version.

- [x] Add migration for `assistant_conversation`.
- [x] Add migration for `assistant_message`.
- [ ] Decide whether usage/run metadata lives in `assistant_runs` or existing AI usage logs.
- [x] Store user messages before generation.
- [x] Store assistant messages after generation completes.
- [ ] Store failed run metadata without exposing internal errors to users.
- [x] Add list conversations endpoint.
- [x] Add conversation detail endpoint.

## Phase 3 - Rate Limit And Entitlements

Goal: protect cost and abuse before public exposure.

- [x] Add assistant-specific Redis rate limiter.
- [x] Limit requests per user per minute.
- [ ] Limit requests per organization per day. Deferred until usage/pricing policy is decided.
- [x] Add max input size.
- [x] Add max output/token budget per response.
- [x] Return `429 RATE_LIMITED` with retry metadata.
- [x] Add feature flag for internal rollout.
- [x] Add backend plan gating.
- [ ] Decide initial public plan availability, likely `professional` and above.

## Phase 4 - Minimal Frontend

Goal: expose the backend through the smallest useful UI.

- [x] Create frontend feature: `src/features/quest-assistant`.
- [x] Add `Ask Quest` button in private topbar.
- [x] Render minimal dialog.
- [x] Send user message to backend.
- [x] Render streamed assistant response.
- [x] Show loading, error, empty, and disabled states.
- [x] List recent conversations.
- [x] Open an existing conversation.
- [x] Start a new conversation.
- [x] Hide model selection completely.
- [x] Keep styling intentionally minimal and easy to replace.

## Phase 5 - Quest App Knowledge

Goal: make the assistant a reliable guide through Quest.

- [x] Create a Quest capability registry.
- [x] Include app pages, route targets, permissions, and plan requirements.
- [x] Add entries for organization settings, branding, billing, invoices, legals, requests, chats, team, activity, and account.
- [x] Add first assistant tool: `search_app_capabilities`.
- [x] Add first assistant tool: `get_current_user_context`.
- [x] Add first assistant tool: `get_current_organization_context`.
- [x] Ensure guide answers are grounded in registry data, not model guesses.

## Phase 6 - Read-Only Business Tools

Goal: let the assistant answer useful operational questions without mutating data.

- [x] Read current subscription and trial state.
- [x] Read organization summary.
- [ ] Read request summary.
- [ ] Read conversation summary.
- [ ] Read member/invitation limits if backend supports them. Current tool exposes member and pending invitation counts only; no plan limit source has been identified yet.
- [ ] Summarize a request.
- [ ] Summarize a conversation.
- [ ] Explain blockers or missing setup data.

## Phase 7 - Action Skills

Goal: add operational skills one by one with confirmation and auditability.

- [x] Define shared action lifecycle: propose, preview, confirm, execute, cancel, expire, fail.
- [x] Add backend action proposal storage.
- [x] Add backend action confirmation and cancellation endpoints.
- [x] Add generic assistant tool: `propose_assistant_action`.
- [x] Skill: open page with user confirmation.
- [x] Add minimal action confirmation UI.
- [ ] Skill: update organization tagline.
- [ ] Skill: update request status.
- [ ] Skill: assign request.
- [ ] Skill: draft a reply.
- [ ] Skill: send/add message only after explicit confirmation.
- [ ] Skill: invite member only after explicit confirmation.
- [ ] Add audit log for every executed action.
- [ ] Add rollback/undo only when the underlying domain supports it.

## Phase 8 - UX Expansion

Goal: improve experience after the backend contract is stable.

- [ ] Add fullscreen mode.
- [ ] Add keyboard shortcut.
- [ ] Add conversation search.
- [ ] Add route-aware prompt suggestions.
- [ ] Add context-aware assistant open state from request/conversation pages.
- [ ] Consider right-side contextual panel only for pages where it improves task flow.
- [ ] Consider dedicated assistant page only if usage becomes central enough.

## Phase 9 - Agent Loop Controls

Goal: make the assistant safe, bounded, and predictable when it starts chaining tools.

TanStack AI provides the core agent loop and supports `agentLoopStrategy` /
`maxIterations`. Quest still owns product-level guardrails because usage,
pricing, user experience, and risk policies are application concerns.

- [x] Add `QUEST_ASSISTANT_MAX_ITERATIONS`.
- [x] Configure TanStack AI `agentLoopStrategy: maxIterations(...)`.
- [x] Add tests for run-control behavior around iterations/tool budgets.
- [ ] Add a user-safe fallback when the agent stops because the iteration limit is reached.
- [x] Add `QUEST_ASSISTANT_MAX_TOOL_CALLS`.
- [x] Add middleware accounting for tool calls per run.
- [x] Stop additional tool execution when the per-run tool call budget is exceeded.
- [x] Add `QUEST_ASSISTANT_MAX_RUN_DURATION_MS`.
- [x] Abort long-running assistant requests with a safe internal reason.
- [ ] Keep short-term Redis rate limiting separate from per-run safety budgets.

Initial recommended values:

- `QUEST_ASSISTANT_MAX_ITERATIONS=6`
- `QUEST_ASSISTANT_MAX_TOOL_CALLS=10`
- `QUEST_ASSISTANT_MAX_RUN_DURATION_MS=60000`

## Phase 10 - Agent Budgeting

Goal: control cost per run, not only response length.

The existing `QUEST_ASSISTANT_MAX_OUTPUT_TOKENS` only limits the final model
output. It does not cap prompt tokens, tool result tokens, multiple model
iterations, or total run cost. TanStack AI exposes usage through middleware, but
Quest must decide the budget policy and what happens when it is reached.

- [x] Add assistant run budget config.
- [x] Track per-run input tokens, output tokens, total tokens, iteration count, and tool call count in runtime middleware.
- [ ] Decide whether run usage is stored in a new `assistant_run` table or existing AI usage logs.
- [ ] Persist completed run usage.
- [ ] Persist failed/aborted run usage when available.
- [x] Add hard cap for maximum output tokens per model call.
- [x] Add hard cap for total tokens per run through TanStack usage middleware.
- [ ] Add budget exceeded error mapping that does not expose internal provider details.
- [x] Add tests for budget enforcement.
- [ ] Keep plan/package quota decisions separate from low-level safety budgets.

Initial budget model:

- Per-response output cap: already implemented with `QUEST_ASSISTANT_MAX_OUTPUT_TOKENS`.
- Per-run safety budget: implemented first as iterations, tool calls, duration, and reported tokens.
- Current total run token cap: `QUEST_ASSISTANT_MAX_RUN_TOTAL_TOKENS=120000`.
- Token/cost budget persistence: add later once we decide where assistant run accounting belongs.

## Phase 10.5 - Middleware Guardrails And Cache

Goal: use TanStack AI middleware where it improves safety or performance without
making the assistant harder to reason about.

- [x] Add read-only tool result caching for repeated calls inside a run.
- [x] Do not cache mutating/action tools.
- [x] Add conservative streamed-content guardrails for obvious secret redaction.
- [ ] Decide whether cache should become cross-request with a user/org-aware key.
- [ ] Decide whether production tracing should stay in Grafana only or receive AI-specific spans later.
- [ ] Add richer guardrails only after we identify real unsafe outputs.

## Phase 11 - Re-Planning

Goal: let the assistant adapt when a tool result changes the path, without
making every request heavy.

TanStack AI already enables basic re-planning naturally: the model observes tool
results and can decide what to do next. Quest should add explicit product rules
only for workflows where mistakes would be costly or confusing.

- [x] Keep simple Q&A and navigation flows lightweight.
- [x] Add global compact agent-loop planning rules.
- [ ] Add workflow-specific planning rules for mutating skills.
- [ ] Add a structured action preflight step for mutating actions:
  - validate intent
  - check permission
  - preview change
  - request confirmation
  - execute only after confirmation
- [ ] Add tool result contracts that clearly describe recoverable failures.
- [x] Add tests for fallback behavior when permissions are missing.
- [ ] Add tests for fallback behavior when a registry route cannot be resolved.
- [ ] Add tests for unsupported action requests.
- [ ] Consider structured-output planning only when workflows become multi-step enough to justify it.

Initial re-planning scope:

- Use the natural TanStack tool loop for guide/read-only flows.
- Use explicit preflight + confirmation for mutating skills.
- Do not add a separate planner agent until a real workflow needs it.

## Phase 11.5 - Conversation Context Management

Goal: keep long assistant conversations usable without asking users to start a
new chat.

- [x] Add two product-level context thresholds:
  - `QUEST_ASSISTANT_CONTEXT_COMPACTION_THRESHOLD_TOKENS=60000`
  - `QUEST_ASSISTANT_CONTEXT_HARD_LIMIT_TOKENS=100000`
- [x] Add token-aware context window selection before each model run.
- [x] Keep recent conversation turns raw when the full history crosses the compaction threshold.
- [x] Store context-window stats on the persisted user message metadata.
- [x] Add persisted conversation summaries for omitted older messages.
- [x] Replace omitted older messages with `conversation.summary + recent raw messages`.
- [ ] Re-compact the summary when the summary itself becomes too large.
- [ ] Add a rare fallback asking for a new chat only when compaction repeatedly fails.

Current behavior:

- Under 60k estimated tokens, the backend sends the unsummarized conversation window normally.
- Above 60k estimated tokens, the backend summarizes older unsummarized messages into `assistant_conversation.summary`, then sends the persisted summary plus recent raw messages.
- 100k is the hard product safety limit and should remain below the model's native context limit.
- If summary generation fails, the assistant still falls back to the recent-message window instead of blocking the user.
- The next step is summary re-compaction so the summary itself remains small over very long conversations.

## Phase 12 - Structured App Knowledge And Retrieval

Goal: maintain one secure, precise source of truth for Quest app knowledge, then
derive both the runtime registry and future vector search index from it.

The structured knowledge file is the canonical "site map" of Quest. It must keep
routes, permissions, plan requirements, actions, and content descriptions
explicit. Vector search is an optional retrieval layer on top of that knowledge,
not a replacement for it.

- [ ] Create a structured knowledge source, likely `src/domains/assistant/application/quest-app-knowledge.ts` or a typed data file.
- [ ] Define schema for each page/capability:
  - stable id
  - area
  - title
  - summary
  - route pattern
  - allowed actions
  - required role
  - plan requirement
  - data sensitivity
  - keywords
  - explanatory documentation text
- [ ] Generate the existing capability registry from that source.
- [ ] Add validation tests that every route capability has role and plan requirements.
- [ ] Add validation tests that action-capable entries define risk and confirmation policy.
- [ ] Add validation tests that no capability exposes unsafe internal route/data details.
- [ ] Add a retrieval tool over structured knowledge before adding embeddings.
- [ ] Add vector search only after the knowledge base is too large or too fuzzy for keyword/structured matching.
- [ ] If vector search is added, keep registry lookup as the final authority for routes, permissions, and actions.
- [ ] Add stale-index protection so vector entries cannot drift from structured knowledge.

Recommended retrieval order:

1. Use structured registry for routes, permissions, plans, and actions.
2. Use text/semantic retrieval for fuzzy wording and long explanations.
3. Resolve any actionable result back through the structured registry before proposing a UI action.

Security requirements:

- The assistant must not infer permissions from vector search text.
- The assistant must not execute or propose actions from vector results alone.
- The backend must check user and organization permissions before returning sensitive context.
- Vector-search snippets are explanatory context only; structured registry and domain services remain authoritative.

## Verification Checklist

Backend:

- [x] `bun run type-check`
- [ ] `bun test`
- [x] Targeted assistant route tests.
- [x] Rate limit tests.
- [ ] Entitlement tests.
- [ ] Persistence tests.

Latest backend verification, 2026-06-10:

- `bun run type-check` passed.
- `bun run lint` passed.
- `bun test src/domains/assistant/__tests__/assistant.routes.test.ts src/domains/notifications/__tests__/notifications.routes.test.ts src/domains/realtime/__tests__/realtime.architecture.test.ts` passed.
- `bun test` currently has one unrelated existing test isolation failure: `src/domains/subscription/__tests__/subscription.application.test.ts` sees the global module mock from `subscription.routes.test.ts` and cannot import `SubscriptionApplicationService`.

Latest backend verification, 2026-06-11:

- `bun run type-check` passed.
- `bun run lint` passed.
- `bun test src/domains/assistant/__tests__/assistant.routes.test.ts src/domains/assistant/__tests__/assistant-access-policy.test.ts src/domains/assistant/__tests__/quest-capability-registry.test.ts src/domains/assistant/__tests__/assistant-context.test.ts` passed.

Latest backend prompt update, 2026-06-11:

- System prompt updated for natural product-assistant behavior, vague-message handling, route context usage, tool grounding, and future action confirmation.
- OpenAI `verbosity` is intentionally not set in `modelOptions`: the current TanStack AI OpenAI adapter types still expose the old root-level shape, while the Responses API expects `text.verbosity`.

Latest backend action framework update, 2026-06-11:

- Added `assistant_action` persistence, action lifecycle endpoints, generic action proposal tool, and first non-destructive `open_page` action type.

Latest action UI update, 2026-06-11:

- Frontend renders proposed assistant actions, supports confirm/cancel, navigates to confirmed `open_page` results, and avoids the previous empty `No response.` fallback for action-only assistant runs.
- Backend normalizes assistant open-page routes from `/org/:slug/...` and `/org/<organizationId>/...` to the organization slug route.

Frontend:

- [x] `bun run typecheck`
- [x] `bun run ci:check`
- [x] Targeted assistant stream parser tests.
- [ ] Targeted assistant UI tests.
- [ ] Manual streaming verification.
- [ ] Manual authenticated `/me` and `/org/:slug` topbar verification.

Latest frontend verification, 2026-06-11:

- `bun run typecheck` passed.
- `bun run ci:check` passed.
- `bun test src/features/quest-assistant/api/test/quest-assistant-stream.spec.ts` passed.
- `bun run build` passed.

## Open Decisions

- [ ] Exact model name and fallback model.
- [ ] Whether daily org limits are hard limits or soft internal alerts.
- [x] Whether conversation titles are generated by the model or derived from first user message. Initial MVP derives from the first user message.
- [ ] Whether old conversations can be deleted in MVP.
- [ ] Whether assistant access starts at `professional` or `enterprise`.
- [x] Whether TanStack AI client hooks are used on frontend V1, or only backend TanStack AI with a custom lightweight client. Initial MVP uses backend TanStack AI with a custom lightweight frontend stream client.
