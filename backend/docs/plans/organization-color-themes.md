# Organization Color Themes

## Overview

Organizations can choose an accent color from a predefined palette. This color replaces the default blue (`ds-blue-700` / `#006BFF`) for action buttons across the frontend and email templates.

## Backend (implemented)

### Database

- **Migration `0046_add-organization-accent-color.sql`**: Adds `accent_color TEXT NOT NULL DEFAULT 'blue'` to the `organization` table.
- **Drizzle schema**: `accentColor` column added to the organization table definition.

### Palette

Defined in `src/domains/organization/domain/accent-color.ts`. Each entry has a key, label, and hex value:

| Key | Label | Hex | Usage |
|-----|-------|-----|-------|
| `blue` | Blue | `#0020A7` | Default |
| `purple` | Purple | `#9E00F2` | |
| `pink` | Pink | `#F22782` | |
| `teal` | Teal | `#00A694` | |
| `green` | Green | `#28A948` | |
| `orange` | Orange | `#D16100` | |
| `cyan` | Cyan | `#008A9B` | |

### API

- **`PATCH /organizations/:id`** — Accepts optional `accentColor` field (validated against palette keys via Zod enum).
- **`GET /organizations/accent-colors`** — Returns the full palette (no auth required, for frontend picker).
- **`GET /organizations/by-subdomain/:subdomain`** — Now includes `accentColor` in response.
- **`getInfo()`** — Now includes `accentColor` for email service branding.

### Email Templates

- `OrganizationBranding.accentColor` now carries the resolved hex value.
- `EmailButton` accepts an optional `accentColor` prop (falls back to `#006BFF`).
- All 15 templates with EmailButton now pass `accentColor={organization?.accentColor}`.
- The email service resolves the palette key to hex via `getAccentHex()` before injecting into branding.

## Frontend (not yet implemented)

### Plan

1. **CSS Variables**: The accent color should override a CSS variable (e.g. `--color-ds-accent-700`) that replaces all `ds-blue-700` usages in action contexts (primary buttons, links, active states). This can be done via an inline style on the root layout or a `<style>` tag.

2. **Color Picker UI**: Add a color picker component in **Settings > General** page. Display the 7 palette options as colored circles. The selected one gets a checkmark or ring. On click, call `PATCH /organizations/:id` with the new `accentColor`.

3. **Fetching**: The accent color comes from the session/organization data already loaded by the layout provider. No additional API call needed for the current org's color.

4. **Mapping palette keys to CSS scales**: Each palette key (blue, purple, pink, etc.) maps to the existing `ds-{key}-*` CSS variable family in `colors.css`. On the frontend, selecting "purple" would set `--color-ds-accent-700` to `var(--color-ds-purple-700)`, etc.

5. **Components to update**: `button.tsx` (primary variant), any component using `bg-ds-blue-700`, `text-ds-blue-700`, `border-ds-blue-700` for action/accent purposes. A find-and-replace audit of `ds-blue-700` usage will identify all targets. Non-accent usages of blue (info badges, etc.) should remain blue.

### Files to create/modify (frontend)

- `features/settings/components/accent-color-picker.tsx` — New component
- `features/layout/profile-layout-provider.tsx` — Expose `accentColor` in state, inject CSS variable
- `app/styles/colors.css` — Add `--color-ds-accent-*` variables with default blue values
- `components/ui/button.tsx` — Primary variant uses accent instead of blue
- `routes/profile/settings/general.tsx` (or wherever General settings are) — Mount picker

### Considerations

- **Showcase page**: The public company page should also use the org's accent color. It already fetches org data via subdomain (which now includes `accentColor`).
- **Accessibility**: All palette colors should meet WCAG AA contrast ratio (4.5:1) against white text. The chosen hex values are dark enough for white text.
- **No dark mode impact**: The platform doesn't have dark mode currently, so no dual-palette needed.
