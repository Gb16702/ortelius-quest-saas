# Shared UI Rules

This folder contains shared primitives and app-level reusable UI. It must not import from `src/features`.

Only add a component here when it is truly reusable across multiple domains. If it knows about requests, subscriptions, settings, cargo, services, or organization-specific workflows, keep it in the owning feature.

Prefer composition over behavior flags. Boolean props are fine for UI state, but avoid boolean props that create separate behavioral variants.

Props use explicit `interface` declarations. Exports are named. Use `ref` as a normal prop for new primitives unless a Radix or third-party wrapper still requires `forwardRef`.

Accessibility belongs inside the primitive: labels, `aria-label` for icon-only buttons, visible `focus-visible` states, keyboard behavior, and semantic elements.

Use `lucide-react` icons when an icon exists there. Keep icon-only controls named for assistive tech.

Do not introduce feature-specific data fetching, mutations, routing decisions, or business validation in shared UI.

When adding selection controls, tables, dialogs, sheets, or forms, inspect nearby primitives first and extend the existing pattern instead of creating a parallel one.
