# CWUI-First Style Contract

CropWatch uses CWUI as the only visual source of truth for colors, surfaces, borders, typography, states, and theming. Local app code may control structure, not a parallel theme system.

## Shell Contract

- The authenticated shell in [`src/routes/+layout.svelte`](/home/kevin/source/repos/cropwatch/CropWatch/src/routes/+layout.svelte) owns the viewport.
- [`src/routes/layout.css`](/home/kevin/source/repos/cropwatch/CropWatch/src/routes/layout.css) defines one vertical scroll owner: `.app-shell__main`.
- `Header`, `PwaDock`, and `OverviewDrawer` stack through `.app-shell__content` and `.app-shell__bottom-chrome`.
- Routes must not add bottom spacing to compensate for the drawer or PWA dock.

## Shared Layout Primitives

- [`AppPage`](/home/kevin/source/repos/cropwatch/CropWatch/src/lib/components/layout/AppPage.svelte): max-width page shell and page padding.
- [`AppSection`](/home/kevin/source/repos/cropwatch/CropWatch/src/lib/components/layout/AppSection.svelte): vertical section spacing.
- [`AppFormStack`](/home/kevin/source/repos/cropwatch/CropWatch/src/lib/components/layout/AppFormStack.svelte): shared form/content stack with optional padding.
- [`AppActionRow`](/home/kevin/source/repos/cropwatch/CropWatch/src/lib/components/layout/AppActionRow.svelte): shared action alignment and mobile stacking.
- [`AppNotice`](/home/kevin/source/repos/cropwatch/CropWatch/src/lib/components/layout/AppNotice.svelte): shared empty/error/info state wrapper.
- [`chartPalette.ts`](/home/kevin/source/repos/cropwatch/CropWatch/src/lib/theme/chartPalette.ts): semantic chart colors derived from CWUI tokens.

## Local CSS Rules

Allowed outside CWUI:

- Layout, spacing, width constraints, responsive ordering
- Overflow control and height ownership
- Table/chart geometry and page-specific composition

Disallowed outside CWUI or shared theme files:

- Hard-coded hex or `rgb(...)` colors
- Page-local surface themes and ad-hoc shadows
- Fixed-position app chrome
- Non-standard raw breakpoints

Use these breakpoints only:

- `640px` / `639px`
- `768px` / `767px`
- `1024px` / `1023px`

## Audit Workflow

- Run `npm run style:audit` to check non-allowlisted app files for hard-coded colors and non-standard breakpoints.
- The allowlist in [`scripts/style-audit.mjs`](/home/kevin/source/repos/cropwatch/CropWatch/scripts/style-audit.mjs) is temporary coverage for legacy areas that have not been normalized yet.
- When a legacy area is migrated, remove it from the allowlist in the same change.
