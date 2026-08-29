# VoIP interop — Twin ↔ Quest

How a user logged into Twin (`ortelius-api-v2` / `ortelius-twin-frontend`) can call
a user logged into Quest (`ortelius-quest-api` / `ortelius-quest-frontend`), and
vice versa.

The two systems implement WebRTC calls **independently** today. Every layer of
the stack (signaling protocol, REST surface, identity model, persistence) was
designed in isolation. Interop is therefore not a "wire two endpoints together"
problem — it requires either a shared protocol or an explicit bridge.

This document describes:

1. The current divergence (what's incompatible).
2. Three interop strategies, with trade-offs.
3. The recommended path and a concrete migration plan.

---

## 1. Current divergence

### 1.1 Signaling protocol

| | Twin | Quest |
|---|---|---|
| WS path | `GET /call` (dedicated) | `GET /` (shared realtime, multiplexed) |
| Auth | Bearer JWT — `?token=` or header | Session/cookie via `requireAuth` middleware |
| Manager | `CallWebSocketManager` (own connection pool) | `RealtimeService` + `VoipWebSocketManager` (shares pool with chat/presence) |
| Stale GC | 5-min timeout, 60s sweep | (none documented — relies on `close` event) |

**Message types do not overlap**:

```jsonc
// Twin
{ "type": "webrtc:offer",  "callId": "<id>", "sdp": "<sdp>", "from": "<userId>" }
{ "type": "webrtc:answer", "callId": "<id>", "sdp": "<sdp>", "from": "<userId>" }
{ "type": "webrtc:ice",    "callId": "<id>", "candidate": "<c>", "sdpMid": "0", "sdpMLineIndex": 0 }
{ "type": "call:join",     "callId": "<id>" }
{ "type": "call:leave",    "callId": "<id>" }

// Quest
{ "type": "voip_offer",         "callId": "<id?>", "conversationId": "<convId>", "fromUserId": "...", "targetUserId": "...?", "offer":  { "type": "offer",  "sdp": "<sdp>" }, "timestamp": "..." }
{ "type": "voip_answer",        "callId": "<id?>", "conversationId": "<convId>", "fromUserId": "...", "targetUserId": "...?", "answer": { "type": "answer", "sdp": "<sdp>" }, "timestamp": "..." }
{ "type": "voip_ice_candidate", "callId": "<id?>", "conversationId": "<convId>", "fromUserId": "...", "candidate": { "candidate": "<c>", "sdpMid": "0", "sdpMLineIndex": 0 }, "timestamp": "..." }
{ "type": "voip_call_request",  "conversationId": "<convId>", "callType": "audio|video", "callId": "<id?>", "fromUserId": "...", "fromUserName": "...", "timestamp": "..." }
{ "type": "voip_call_response", "conversationId": "<convId>", "callId": "<id>", "accepted": true, ... }
{ "type": "voip_call_end",      "conversationId": "<convId>", "callId": "<id>", ... }
```

A Twin client cannot understand a `voip_offer` (and vice versa). Even renaming
wouldn't be enough: payload shapes differ — `sdp` is a flat string in Twin,
nested under `offer.sdp` in Quest; ICE fields are flat in Twin, wrapped in a
`candidate` object in Quest.

### 1.2 Call lifecycle / REST

| | Twin (`ortelius-api-v2`) | Quest (`ortelius-quest-api`) |
|---|---|---|
| Initiate | `POST /calls` `{ calleeId, type, conversationId? }` | `POST /calls` `{ calleeId?, conversationId (required), callType }` |
| Sessions | — | `POST /calls/sessions` (in-memory) |
| Active | `GET /calls/active` | `GET /calls/active` |
| Detail | `GET /calls/:callId` | `GET /calls/:callId` |
| Update status | `PATCH /calls/:callId` (`accepted/rejected/ended/missed`) | same |
| ICE servers | `GET /calls/ice-servers` | `GET /calls/ice-servers` (same wire format) |
| Recording init | `POST /calls/:callId/recording/init` | `POST /calls/:callId/recording/initiate` |
| Recording finalize | `POST /calls/:callId/recording/complete` | same path |
| `callId` source | MongoDB ObjectId | UUID or `call_${userId}_${ts}` |
| Persistence | MongoDB `CallModel` | PostgreSQL `voipCall` (Drizzle) |

### 1.3 Identity / addressing

- **Twin**: caller picks a `calleeId` directly. `conversationId` is optional. No
  org filtering — calls are user-to-user globally.
- **Quest**: a call is *always* attached to a conversation. `calleeId` may be
  `null` for group calls (broadcast to all conversation participants). Org
  scope is implicit through the conversation.

This is the deepest mismatch: **a Twin caller has no Quest-side conversation to
attach to, and a Quest caller has no Twin-side conversation either**.

### 1.4 STUN/TURN

Compatible. Both expose `GET /calls/ice-servers`, both default to
`stun:stun.l.google.com:19302`, both build TURN credentials with HMAC-SHA1
(`expiry:userId`) and a configurable TTL via `TURN_SERVER_URL` /`TURN_SECRET`.
Either side's ICE server endpoint can be used by either client.

### 1.5 Persistence

Both record `startedAt`, `endedAt`, `duration`, `recordingUrl`, transcript
reference. Schemas are different (Mongo doc vs. Drizzle row) but the conceptual
model overlaps. Reconciliation across systems is feasible if both write the
same logical record.

---

## 2. Strategies

### Option A — Shared protocol package (recommended)

Promote a single canonical signaling protocol (the new `webrtc:*` shape coming
out of the in-flight Quest refactor toward Twin's protocol) into a shared
package, e.g. `@ortelius/voip-protocol`. Both backends import the same Zod
schemas; both frontends use the same client wrapper.

```
@ortelius/voip-protocol/
  ├── messages.ts      # discriminated union, Zod schemas
  ├── ice.ts           # ICE server response shape
  └── rest.ts          # REST request/response shapes
```

Once protocols are aligned, interop becomes a question of **who hosts the
signaling channel**. See Option C for cross-app routing.

**Pros**: single source of truth, no per-side translation, future
synchronization is automatic (publish a new package version → both apps
consume it).
**Cons**: requires the Quest-side refactor to land first, plus extracting the
package and wiring publish/version bumps.

### Option B — Per-system bridge / translator

Keep both protocols intact; introduce a small server (`ortelius-voip-bridge`)
that maintains WS connections to both Twin and Quest signaling endpoints and
translates messages on the fly:

```
Twin client ──ws──> Twin /call ──out───┐
                                       │
                       ┌─────  bridge ─┤
                       │               │
Quest client ──ws──> Quest realtime ───┘
```

The bridge translates:

- `webrtc:offer` ↔ `voip_offer` (rewrap `sdp` ↔ `offer.sdp`)
- `webrtc:ice` ↔ `voip_ice_candidate` (rewrap candidate fields)
- `call:join` / `call:leave` ↔ `voip_call_request` / `voip_call_end`
- ICE servers exposed via either origin

It also resolves identity:

- Twin user ↔ Quest user via shared **Cognito sub** (both auth providers
  produce the same `sub` for the same email). The bridge maintains a
  user-to-system mapping at connection time.
- A "ghost conversation" is created on the Quest side for inbound Twin calls
  so Quest's "calls require conversationId" constraint is met.

**Pros**: no breaking changes to either app. Can be deployed independently.
**Cons**: extra service to operate, two protocols to maintain, twice the
attack surface. Cross-org call records get split between both DBs.

### Option C — Federated signaling on a single endpoint

Have one app (probably `ortelius-api-v2`, since its WS endpoint is dedicated to
calls) become *the* signaling host. Quest's frontend connects to Twin's `/call`
endpoint for VoIP, while keeping its existing realtime WS for chat/presence.
Quest backend stops handling signaling messages — it only cares about the call
record, written via a webhook from Twin when a call starts/ends involving a
Quest user.

This requires Option A first (shared message shapes) so the Quest frontend can
talk to Twin's WS, but eliminates Option B's translation overhead.

**Pros**: one signaling stack, one place to debug/scale.
**Cons**: forces cross-app dependency: Quest frontend needs Twin to be up to
make calls; cross-org auth must be unified upfront; observability/metrics
unify into one system.

---

## 3. Recommended path

A staged plan that minimizes lock-in and lets each step ship independently:

**Stage 1 — protocol alignment (in progress).**
Refactor Quest to Twin's `webrtc:*` protocol on a dedicated `/call` WS. After
this, both apps speak the same on-the-wire protocol; only the auth layer and
addressing rules differ.

**Stage 2 — extract `@ortelius/voip-protocol`.**
Move message schemas out of both repos into a shared package. Both backends
validate inbound messages with the same Zod schemas. Both frontends use the
same TS types.

**Stage 3 — unify identity.**
Confirm both apps resolve users by Cognito `sub` (Quest already does in
`user-provisioning.service.ts`; Twin does too via `CognitoTokenVerifier`).
Document the assumption that the same email → same `sub` across apps.

**Stage 4 — bridge.**
Build a thin bridge that:

1. Authenticates a caller against either system's Cognito token.
2. Resolves the callee's home system (Twin or Quest) by `sub`.
3. If same system → forwards traffic verbatim (passthrough).
4. If cross-system → opens a paired connection on the callee's side and pipes
   messages.
5. Writes a unified call record by issuing `POST /calls` on both sides with
   the same `callId` (UUID generated by the bridge).

The bridge is a single Node service, ~300 LOC. It can run anywhere the two WS
endpoints are reachable. It needs no DB of its own — only a short-lived
in-memory map of `callId → { twinSocket, questSocket }`.

**Stage 5 — UI affordances.**
Frontends need to surface "external call to <user@otherapp>" and handle
disconnects from either side as a normal hangup.

---

## 4. Open questions (block before Stage 4)

1. **Conversation requirement**: today Quest hard-requires `conversationId` on
   every call (DB column is `notNull`, REST schema rejects missing values). For
   inbound Twin calls, do we (a) auto-create a stub conversation on Quest's
   side, (b) drop the constraint and add a `directCall` boolean, or (c) refuse
   inbound calls without a conversation?
2. **Group calls**: Quest supports group calls via `calleeId = null`; Twin
   doesn't. If a Quest group call includes a Twin user, how does Twin's side
   render it?
3. **Recording / transcript**: which side stores the recording when call
   participants span apps? Today both apps have their own S3 buckets and
   transcript pipelines.
4. **Metrics**: Quest has `callMetrics`, Twin has `metrics:batch`. Schema is
   close but not identical. Unify or accept asymmetric collection?
5. **TURN credentials**: each side mints its own. For interop calls, both
   peers can request from either side (same `TURN_SERVER_URL` is assumed); if
   the URLs diverge, the bridge has to negotiate which TURN to use.

Resolve at least 1–3 before implementing the bridge.

---

## 5. Reference — file pointers

| | Twin | Quest |
|---|---|---|
| WS auth | `ortelius-api-v2/src/contexts/call/presentation/websocket/CallWebSocketManager.ts` | `ortelius-quest-api/src/infrastructure/realtime/realtime.service.ts` |
| Initiate use case | `ortelius-api-v2/src/contexts/call/application/use-cases/InitiateCall.ts` | `ortelius-quest-api/src/domains/calls/voip.services.ts` |
| REST routes | `ortelius-api-v2/src/contexts/call/presentation/routes/authenticated.routes.ts` | `ortelius-quest-api/src/domains/calls/calls.routes.ts` |
| Frontend signaling | `ortelius-twin-frontend/app/features/voip/services/call-signaling.service.ts` | `ortelius-quest-frontend/app/features/voip/services/voip-signaling.service.ts` |
| Frontend WS hook | `ortelius-twin-frontend/app/features/voip/hooks/use-voip-ws-events.ts` | `ortelius-quest-frontend/app/features/voip/hooks/use-voip-ws-events.ts` |
| ICE servers | `ortelius-api-v2/.../authenticated.routes.ts` (line ~96–154) | `ortelius-quest-api/src/infrastructure/networking/turn.utils.ts` |
| Persistence | MongoDB `CallModel`, `TranscriptModel` | Drizzle `voipCall`, `voipCallParticipant`, `transcript`, `callMetrics` |
