# Requests Feature

This feature owns request lists, request details, quotes, invoice display inside request details, send-request flow, assignment, export, sharing, and request sheet/modal behavior.

Keep send-request wizard code under `ui/send-request`. Step components live in `ui/send-request/steps`.

Keep quote-specific UI in `ui/quotes` and quote state in `model/hooks`. Reuse existing quote hooks before adding another quote state helper.

TanStack Query query/mutation files live in `api/` and may be split by sub-domain. Feature state hooks live in `model/hooks/`; persisted UI stores use `model/use-*.store.ts`.

URL/search filter state should use the request-owned `nuqs` parser patterns from `src/features/requests/lib/request-url.state.ts`.

Do not duplicate request status or priority rendering. Reuse `StatusDisplay`, `PriorityBadge`, and `PriorityBars`.

Preserve optimistic update, undo, and cache invalidation behavior in mutations. If changing assignment, quote, status, or sharing behavior, verify both success and failure paths.

Before declaring done, verify request list behavior and request modal/detail behavior separately when the change touches both.
