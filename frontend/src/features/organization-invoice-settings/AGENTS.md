# Organization Invoice Settings Feature

This feature owns Invoices settings UI, invoice sheet URL state, invoice API
parsing, and invoice MSW handlers.

Keep Invoices isolated from Branding and Business settings. Consumers should use
this feature's public API instead of importing internal files.

Invoice API responses remain runtime-validated with Valibot schemas before the UI
trusts them.

When changing settings UI, keep operational SaaS density and scanability. Prefer
clear sectioning and direct labels over marketing-style layout.
