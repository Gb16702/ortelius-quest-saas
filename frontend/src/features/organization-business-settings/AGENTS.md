# Organization Business Settings Feature

This feature owns Business settings UI and interactions: catalog selection,
pricing data entry points, and email intake toggles.

Business catalog read models and query options live in `src/entities/organization`
so route prefetching does not import this feature's UI. Business mutations and
optimistic cache helpers stay in this feature.

Keep Business isolated from Branding and Invoices settings. Consumers should use
this feature's public API instead of importing internal files.

When changing settings UI, keep operational SaaS density and scanability. Prefer
clear sectioning and direct labels over marketing-style layout.
