# Organization Branding Settings Feature

This feature owns Branding settings UI and interactions: overview, tagline,
website, logo upload/crop/remove, and organization font controls.

Keep Branding isolated from Business and Invoices settings. Consumers should use
this feature's public API instead of importing internal files.

Preserve Valibot validation, existing mutation flows, image/logo handling,
workspace shell invalidation, and toast/error behavior.

When changing settings UI, keep operational SaaS density and scanability. Prefer
clear sectioning and direct labels over marketing-style layout.
