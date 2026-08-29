# Config Rules

This folder contains application-wide runtime configuration and environment parsing.

Keep feature-specific constants inside the owning feature. If a value belongs to a business domain or a single route flow, it does not belong here.

Keep server-only environment parsing in `.server.ts` files. Browser-safe public values must come from explicitly public variables such as `VITE_*`.

Do not put secrets, tokens, or private service credentials in browser-importable modules. Anything imported by client code can end up in the browser bundle.

Prefer validated, typed config objects over reading `process.env` or `import.meta.env` directly throughout the app.

Do not add barrel files. Import config directly from its source file.
