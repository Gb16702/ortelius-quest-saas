# Clean DDD Hexagonal Migration Plan

## Context

The API already groups code by business area under `src/domains`, but those folders are not clean architectural boundaries yet. Routes, use-case orchestration, persistence queries, infrastructure SDK calls, and business rules are often colocated in the same service files.

The migration will be incremental. The first vertical slice is `Requests`, because it is central to the product workflow and already has a partial application facade, route tests, and service tests.

## Target Shape

Each migrated domain should move toward this structure:

```text
src/domains/{context}/
  domain/          # pure entities, value objects, rules, events, errors
  application/     # use cases and ports
  infrastructure/  # driven adapters: Drizzle, email, notifications, messaging
  presentation/    # driver adapters: Hono routes, schemas, HTTP mapping
```

Dependency direction must stay inward:

```text
presentation -> application -> domain
infrastructure -> application -> domain
```

`domain` and `application` must not import Hono, Drizzle, Stripe, OpenAI, AWS SDKs, or `src/infrastructure`.

## Requests Slice

The first implementation introduces:

- request status and transition rules in `requests/domain`
- request priority calculation in `requests/domain`
- request domain errors and domain events
- application ports for request persistence, activity, notification, conversation, organization membership, and document storage
- use cases for create, reject, cancel, assign, and validate draft
- infrastructure adapters that bridge the new use cases to the existing services

The HTTP API remains compatible. Existing routes continue to use `requestsApplicationService`; that facade delegates migrated behaviors to the new use cases.

Current progress in the pilot slice:

- domain rules, application ports, infrastructure adapters, and architecture tests are in place
- lifecycle commands, assignment, document removal, anonymous user linking, request-number lookup, relation loading, request list queries, and create/update persistence have moved behind `DrizzleRequestRepository`
- assignment, reassignment, unassignment, draft deletion, request creation conversation setup, and request metrics now sit behind application ports
- request update activity logging now sits behind `ActivityLogPort` instead of the Hono handler
- sharing a request to team chat now runs through a Requests use case with membership, team chat, and activity ports
- request list routing and assignment member lookup now use application use cases backed by an organization query port
- request organization membership, member lookup, and organization request listing now use Requests infrastructure adapters directly instead of calling `OrganizationService`
- request action, assignment, ownership, and self-request HTTP middleware now delegate to application use cases instead of Drizzle or organization services
- request notification side effects are split into explicit email, in-app notification, system-message, and query adapters
- request conversation setup/linking is split into orchestration, query, persistence, and system-message adapters, with dedicated tests and an architecture guard against direct Drizzle/message-service imports in the orchestrators
- `RequestsApplicationService` delegates all covered request commands and queries to application use cases while preserving the existing HTTP response contracts
- remaining quote, invoice, document, and seed callers now use `RequestsApplicationService`; the legacy `RequestsService` file has been removed
- Hono routes, request DTO schemas, and request HTTP middleware now live under `requests/presentation`
- request command/read-model contracts now live under `requests/application`; the legacy root `requests.types.ts` surface has been removed

## Migration Sequence

1. Done: land the `Requests` domain/application skeleton with tests and architecture guardrails.
2. Done: move Drizzle request persistence and query behavior into `DrizzleRequestRepository`.
3. Done: split email, notification, metrics, conversation, and system-message side effects into explicit adapters.
4. Done: move request routes, DTO schemas, and HTTP middleware into `requests/presentation`.
5. Done: repeat the vertical-slice migration for `Quotes`, `Invoice`, `Organization`, and `Subscription`.
6. Done: migrate smaller catalog/supporting domains in larger coherent blocks: `Categories`, `Services`, `Notifications`, `Activity`, `Storage`, `Contact`, `Onboarding`, `Documents`, `Invitations`, `Members`, `User`, `Eblast`, `LegalDocument`, `Messaging`, `Auth`, and `PricingIntelligence`.
7. Done: migrate the remaining legacy-heavy slices: `Calls`, `Realtime`, `Metrics`, `Checkout`, and `Webhooks`.

## Invoice Slice

Current progress:

- invoice HTTP routes, DTO schemas, and ownership middleware now live under `invoice/presentation`
- the Drizzle-backed invoice service now lives under `invoice/infrastructure`
- invoice command/read-model contracts now live under `invoice/application` without importing database schemas
- invoice ownership checks now run through an application use case with Drizzle and organization role adapters instead of direct persistence in Hono middleware
- invoice create/read/list/send routes now call `InvoiceApplicationService`; activity logging for created/sent invoices sits behind application ports
- invoice status guards, quote-to-invoice pricing projection, invoice-number formatting, and typed domain errors now live under `invoice/domain`
- invoice lifecycle side effects for created/sent invoices now run behind an application port, with an infrastructure adapter owning metrics, system-message, and email integrations
- invoice create/send orchestration now lives in application use cases; the Drizzle invoice service exposes focused quote/request lookup, duplicate check, create, list, and mark-sent persistence methods
- invoice route tests are active again and exercise the presentation adapter against `InvoiceApplicationService`
- the Drizzle invoice persistence adapter is now named `invoice.repository.ts`; the old `invoice.service.ts` adapter and mock-only service test have been removed
- API routes and quote lifecycle side effects now import the owning invoice presentation/infrastructure modules directly
- invoice architecture tests guard application/presentation boundaries and prevent removed root compatibility modules from returning

## Quote Slice

Current progress:

- quote pricing, supported-currency validation, status transition guards, and quote domain errors now live under `quote/domain`
- quote create/update/respond/list orchestration now lives under `quote/application` with ports for repository, permissions, legal documents, request lookup, organization resolution, and activity logging
- quote routes and middleware now live under `quote/presentation` and call `QuoteApplicationService` instead of directly coordinating persistence, legal documents, requests, activity logging, and the concrete quote service
- quote lifecycle side effects for sent, accepted, and rejected quotes now run behind an application port, with an infrastructure adapter owning email, in-app notification, system-message, metrics, invoice, and pricing-intelligence integrations
- the quote Drizzle repository now implements the application repository port directly; the temporary legacy repository wrapper has been removed
- quote HTTP DTO schemas now live under `quote/presentation`; legal document response parsing lives in `quote/infrastructure` behind application-owned response types
- root Quote type exports now alias application/domain-owned types instead of importing database schemas
- a Quote architecture test now guards `quote/domain` and future `quote/application` code from infrastructure/framework imports
- the Quote architecture guard now also prevents the legacy repository adapter from re-absorbing lifecycle side-effect services
- quote route tests now exercise the presentation adapter against `QuoteApplicationService` with the existing HTTP contract instead of being skipped around the old concrete service
- quote root route, middleware, schema, service, and type compatibility modules have been removed; API and tests now import the owning presentation/application/infrastructure modules directly
- the Drizzle quote persistence adapter is now named `quote.repository.ts`; the old `quote.service.ts` adapter and mock-only service test have been removed

## Organization Slice

Current progress:

- organization accent colors now live in `organization/domain`
- organization profile/info read models now live in `organization/domain`
- organization `by-slug` and `info` queries now run through application use cases and a Drizzle query-port adapter
- organization setup-status now derives completion in pure domain code and loads membership/setup snapshots through application ports
- organization user-role lookup now runs through the application membership use case instead of the concrete organization service
- organization settings and tax ID updates now enforce admin/owner rules in application use cases backed by a Drizzle settings adapter
- organization email intake updates now run through an application use case with explicit Drizzle and team-chat notification ports
- organization status flag calculation is pure domain logic
- organization status lookup now runs through an application use case and query port
- `organization-status.routes` now lives under `organization/presentation` and calls `OrganizationApplicationService` instead of querying Drizzle directly
- main organization routes and DTO schemas now live under `organization/presentation`
- a Drizzle organization status repository implements the application query port without changing the `/api/organizations/:organizationId/status` response shape
- organization dashboard and member-list queries now run through application use cases backed by Drizzle query ports, removing two more direct route calls to the legacy service
- organization request listing now delegates to the Requests application use case instead of `OrganizationService.getRequests`
- organization member role changes, member removal, and member self-leave now run through application use cases with domain rule checks and explicit activity, notification, seat-reconciliation, and Drizzle ports
- organization showcase reads and logo update/removal now run through application use cases with Drizzle, S3, metrics, activity, service, and category adapters
- email branding, invoice ownership checks, and activity event listing now consume `OrganizationApplicationService` instead of importing the legacy concrete service
- metrics routes, metrics middleware, and metrics GraphQL resolvers now resolve organizations through `OrganizationApplicationService`; request aggregation moved behind a Requests application use case
- the legacy `OrganizationService` concrete service and its skipped legacy test have been removed after all runtime imports were migrated
- organization domain/application architecture tests and status route tests are in place
- organization root route, status-route, schema, color, type, and Stripe customer compatibility modules have been removed; API, email branding, and subscription billing now import the owning presentation/domain/subscription infrastructure modules directly

## Subscription Slice

Current progress:

- subscription seat synchronization now has pure domain seat rules, application ports/use case orchestration, and Drizzle/Stripe infrastructure adapters
- subscription cancellation/resume now has pure domain rules, application use case orchestration, and Drizzle/Stripe infrastructure adapters
- invoice email, invoice language, and billing address preferences now share a billing-preferences use case with pure validation and Stripe/organization adapters
- subscription payment-method read, setup-intent creation, and default payment-method update now run through application use cases with Drizzle and Stripe adapters
- subscription creation and confirmation now run through application use cases with pricing, Drizzle, Stripe, and customer-registry adapters
- Stripe subscription/invoice webhook state updates now run through an application use case with a Drizzle webhook repository
- subscription plan preview, upgrade, scheduled downgrade, and pending-change cancellation now run through application use cases with Drizzle, Stripe, and pricing adapters
- subscription Hono routes now live under `subscription/presentation`; the API router imports the presentation adapter directly and the previous root route compatibility module has been removed
- subscription architecture tests now guard domain/application from Stripe, Hono, and infrastructure imports
- the `/subscription/current` query now runs through a current-subscription use case with a Drizzle query adapter and Stripe price snapshot adapter, preserving the anonymous, no-organization, inactive, and active response shapes
- subscription invoice listing/detail, billing portal session creation, and customer provisioning now run through a billing-account use case with explicit access, customer-registry, Stripe invoice, and Stripe portal ports
- subscription billing/admin access checks now run through an application use case and Drizzle access adapter, removing direct `member` queries from subscription Hono routes
- subscription activity logging for seat reconciliation, plan changes, subscription lifecycle, payment method, billing address, invoice email, and invoice language now runs behind a subscription activity port instead of direct Hono route calls
- subscription Hono routes now call a single `SubscriptionApplicationService` facade instead of importing the legacy root `subscription-*.service.ts` compatibility facades
- invitation acceptance, organization member side effects, and the seat reconciliation job now call `SubscriptionApplicationService` for seat synchronization instead of the legacy `subscriptionSeatsService`
- the legacy root subscription service facades and Stripe webhook handler facade have been removed after runtime callers were migrated to `SubscriptionApplicationService`
- Stripe webhook event-to-snapshot mapping now lives in the webhook adapter, keeping `SubscriptionApplicationService` free of Stripe event types
- a subscription architecture guard now prevents removed root compatibility facades and the root route shim from coming back
- Stripe customer registry lookup/creation now lives in subscription infrastructure behind `SubscriptionCustomerRegistryPort`, removing the last subscription import of the organization root Stripe customer service

## Catalog Slice: Categories and Services

Current progress:

- category and service sorting rules now live in pure `domain` modules and return sorted copies instead of mutating caller-owned arrays
- category and service read/update contracts now live under `application` with repository ports and use cases for list, list-by-organization, update-organization-selection, and list-with-selection-status
- the former Drizzle services now live as `DrizzleCategoryRepository` and `DrizzleServiceRepository` infrastructure adapters
- Hono routes and Zod DTO schemas now live under `presentation` and call application facades instead of concrete Drizzle services
- organization routes, organization showcase reads, webhooks, and the API router now consume the category/service application or presentation entry points
- root category/service route, schema, service, and type compatibility files have been removed
- unit tests now cover pure sorting rules, application use cases with mocked ports, HTTP route contracts through application facades, and architecture guards for forbidden dependencies

## Notifications Slice

Current progress:

- notification payload title/data mapping now lives in pure domain code
- notification persistence, unread/read/archive, batch send, and semantic notification operations now sit behind an application `NotificationPort`
- Hono routes and DTO schemas now live under `notifications/presentation` and call `NotificationApplicationService`
- the Drizzle/WebSocket implementation now lives under `notifications/infrastructure` and owns JSON persistence, WebSocket fan-out, and in-memory subscription tracking
- realtime, messaging, requests, quote lifecycle, calls, and API routing now consume notification application/presentation entry points instead of the legacy concrete service path
- root notification route, schema, service, and type compatibility files have been removed
- tests now cover pure notification payload builders, application use cases with mocked ports, HTTP route contracts through the application facade, and architecture dependency guards

## Activity Slice

Current progress:

- activity cursor encoding/decoding and event-type metadata now live under `activity/domain`
- activity read/write models and repository port now live under `activity/application`
- activity logging, event listing, and event type listing now run through use cases behind `ActivityApplicationService`
- the Drizzle activity query/write implementation now lives under `activity/infrastructure`
- Hono routes and query schemas now live under `activity/presentation`, preserving the `/api/activity` contract
- root activity route, schema, service, type, and constants files have been removed
- tests now cover cursor/domain metadata, application use cases, route behavior, and architecture boundaries

## Messaging Slice

Current progress:

- conversation, message-read, team-chat, and message routes now live under `messaging/*/presentation`
- message send/edit/delete/upload orchestration now runs through application use cases and ports
- Drizzle message persistence, attachment storage, and WebSocket fan-out live in infrastructure adapters
- message route tests exercise injected application facades instead of concrete adapters
- architecture tests prevent presentation from importing persistence, storage, encryption, or WebSocket infrastructure directly

## Auth Slice

Current progress:

- auth role hierarchy and email normalization now live in `auth/domain`
- auth provider checks, organization membership lookup, organization validation, and role checks run through application use cases
- Drizzle auth lookup logic now lives in an infrastructure repository adapter
- Hono auth routes live under `auth/presentation` and support injected application facades for tests
- root auth route, schema, service, and type compatibility files have been removed

## Pricing Intelligence Slice

Current progress:

- CSV parsing/template generation and pricing suggestion math now live in pure domain modules
- pricing import, batch deletion, stats, accepted-quote capture, and suggestion orchestration run through application use cases and ports
- Drizzle catalog, membership, accepted quote, historical transaction, and id-generation adapters live under infrastructure
- Hono pricing routes live under `pricing-intelligence/presentation` and preserve existing response shapes
- root pricing route, schema, service, and type compatibility files have been removed

## Remaining Legacy-Heavy Slices

Current progress:

- calls and realtime now expose domain/application/infrastructure/presentation layers with root compatibility facades removed
- call lifecycle, metrics, recording, session state, WebSocket routing, and VoIP persistence are split behind application use cases and infrastructure adapters
- realtime message policy now lives in application code and the WebSocket driver stays in presentation/infrastructure
- metrics HTTP, GraphQL, middleware, organization metrics, member metrics, and time-series behavior now run through application use cases backed by Drizzle adapters
- checkout cardless trial and checkout-session orchestration now run through application use cases with explicit Stripe, repository, slug, conversation, and system ports
- webhooks inbound email extraction, request creation, Stripe webhook mapping, and duplicate checks now run through domain/application rules and infrastructure adapters
- presence now has pure domain presence rules, application ports/use cases, and Redis-backed infrastructure adapters
- shared messaging schemas and models now live under `messaging/presentation` and `messaging/domain`
- root compatibility files for auth, calls, checkout, metrics, pricing intelligence, realtime, and webhooks have been removed
- targeted architecture tests now guard these slices, and the global architecture guard scans every migrated domain/application layer

## Global Architecture Guard

Current progress:

- `src/domains/__tests__/architecture-layers.test.ts` scans every migrated `domain` and `application` layer
- the guard rejects framework, infrastructure, database schema, Stripe, OpenAI, and AWS SDK imports from inner layers
- the guard rejects root-level legacy route, schema, service, type, and repository files under `src/domains/*`

## Constraints

- No database migration in this slice.
- No route shape or response contract changes for `/api/requests/*`.
- Avoid global refactors while the pilot is proving the structure.
- Keep tests focused on observable behavior and dependency boundaries.
