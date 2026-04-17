# CropWatch — Code Patterns & Conventions

This document is the authoritative reference for how pages, forms, and components are built in this codebase. Follow these patterns when adding or modifying code so everything stays consistent and maintainable.

---

## Tech stack

| Concern | Tool |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (runes mode) |
| Language | TypeScript |
| Styles | Tailwind CSS 4 + design-token CSS vars |
| UI library | `@cropwatchdevelopment/cwui` (`CwXxx` components) |
| Layout helpers | `$lib/components/layout` (`AppXxx` components) |
| i18n | Paraglide — always `import { m } from '$lib/paraglide/messages.js'` |
| API | `ApiService` from `$lib/api/api.service` |
| Auth | Supabase JWT; token available as `locals.jwtString` server-side |

---

## Page structure

Every authenticated app page must use `<AppPage>` as its root. Never use a raw `<div>` container with hard-coded padding instead.

```svelte
<AppPage width="lg">     <!-- md | lg | xl | full -->
  ...page content...
</AppPage>
```

`AppPage` provides consistent max-width clamping, horizontal padding, and a vertical flex column with `gap-4` between direct children. Do not add extra padding or gap on the shell div inside.

---

## Back navigation

Every page that can be reached by navigating "into" something (create, edit, settings, detail) must show a back button as the **first child** of `<AppPage>`, before any cards or content.

**Always use:**
```svelte
<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/target-route'))}>
  &larr; {m.action_back()}
</CwButton>
```

- `variant="ghost"` keeps it visually quiet — it is a secondary action.
- `size="sm"` keeps it compact at the top of the page.
- Use `resolve()` from `$app/paths` for all internal routes so base-path handling is correct.

---

## Form pages

### Server actions (preferred)

Use SvelteKit server actions (`export const actions` in `+page.server.ts`) for all create/edit forms where the data can be expressed as flat form fields. This keeps mutation logic on the server and out of the component.

```svelte
<!-- +page.svelte -->
<form method="POST" use:enhance={() => {
  submitting = true;
  return async ({ result }) => {
    submitting = false;
    if (result.type === 'success') {
      await goto(resolve('/target'), { invalidateAll: true });
      return;
    }
    await applyAction(result);
    if (result.type === 'failure' && typeof result.data?.error === 'string') {
      toast.add({ tone: 'danger', message: result.data.error });
    }
  };
}}>
```

```ts
// +page.server.ts
export const actions: Actions = {
  default: async ({ request, locals, fetch }) => {
    const authToken = locals.jwtString ?? null;
    if (!authToken) return fail(401, { error: m.auth_not_authenticated() });

    const formData = await request.formData();
    // validate, call ApiService, return fail() or { success: true }
  }
};
```

**On validation failure** — return `fail(400, { error: '...', ...echoedFields })` so the form can re-populate. Always echo field values back so the user does not lose their input.

### Direct API calls (complex wizard forms)

When a form has complex dynamic client-side state that cannot be expressed as flat HTML form fields (e.g., multi-step wizards with dynamic criteria lists), submit directly from the component via a `handleSubmit` async function. The rules create/edit pages are the canonical example.

```ts
async function handleSubmit() {
  if (!isFormValid || submitting) return;
  submitting = true;
  try {
    const api = new ApiService({ authToken: data.authToken });
    await api.doSomething(payload);
    toast.add({ tone: 'success', message: m.thing_success() });
    goto(resolve('/target'));
  } catch {
    toast.add({ tone: 'danger', message: m.thing_failed() });
  } finally {
    submitting = false;
  }
}
```

---

## Form layout

Wrap all form fields in `<AppFormStack padded>` inside a `<CwCard>`. Use `<AppActionRow>` for the submit/cancel button pair.

```svelte
<CwCard title="..." elevated>
  <form method="POST" use:enhance={...}>
    <AppFormStack padded>

      <!-- Error notice (when present) -->
      {#if form?.error}
        <AppNotice tone="danger">
          <p>{form.error}</p>
        </AppNotice>
      {/if}

      <!-- Fields -->
      <CwInput label={m.common_name()} name="name" bind:value={name} required />

      <!-- Multi-column grids use Tailwind -->
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <CwInput ... />
        <CwInput ... />
      </div>

      <!-- Action buttons always last -->
      <AppActionRow>
        <CwButton type="button" variant="ghost" onclick={() => goto(resolve('/target'))}>
          {m.action_cancel()}
        </CwButton>
        <CwButton type="submit" variant="primary" loading={submitting} disabled={!isValid}>
          {m.action_save()}
        </CwButton>
      </AppActionRow>

    </AppFormStack>
  </form>
</CwCard>
```

**Rules:**
- `<AppFormStack padded>` — always `padded` on the root stack inside a card; the padding comes from the component, not from the card itself.
- `<AppActionRow>` — always the last item in a form stack; cancel on the left, primary action on the right.
- Cancel button uses `variant="ghost"`, primary action uses `variant="primary"`.
- Never add raw `<div style="padding: ...">` wrappers around fields.

---

## Error display

Use `<AppNotice>` from `$lib/components/layout` — never a raw `<p class="form-error">`.

| Situation | Tone |
|---|---|
| Server action validation failure | `danger` |
| User needs to fix something before proceeding | `warning` |
| Informational (e.g., no devices found) | `neutral` |
| Summary / preview | `info` |

```svelte
<AppNotice tone="danger">
  <p>{form.error}</p>
</AppNotice>
```

For validation issue lists (multiple items), show them as a `<ul>` inside the notice body and set `ariaLive="polite"`.

---

## State management

### Form field state

Initialize form fields with `$state`, seeded from the server data on first render:

```ts
// Create form — blank initial state
let name = $state(form?.name ?? '');

// Edit form — seed from the loaded record (capture once to avoid reactive re-seed)
const rule = (() => data.rule)();
let ruleName = $state(rule.name);
```

Never use `$derived` for a mutable form field. `$derived` is read-only; `bind:value` on a derived variable causes unexpected behaviour.

### Derived / computed values

Use `$derived` for computed read-only values:

```ts
let isFormValid = $derived(name.trim().length > 0 && email.trim().length > 0);
let deviceOptions = $derived(data.devices.map(d => ({ label: d.name, value: d.dev_eui })));
```

Use `$derived.by(() => { ... })` when the computation needs intermediate variables.

### App-wide state

Access global state (devices, session, profile, etc.) via `getAppContext()` from `$lib/appContext.svelte`:

```ts
const app = getAppContext();
// app.devices, app.session, app.accessToken, etc.
```

Do not duplicate this data into local state.

---

## API calls

### Server-side (in `+page.server.ts`)

```ts
const api = new ApiService({ fetchFn: fetch, authToken });
const result = await api.getSomething();
```

Always pass `fetchFn: fetch` on the server so SvelteKit's request context is used correctly.

### Client-side (in `.svelte` components)

```ts
const api = new ApiService({ authToken: data.authToken });
const result = await api.getSomething();
```

Do not pass `fetchFn` on the client — the global `fetch` is used automatically.

### Error handling

Use `readApiErrorMessage` from `$lib/api/api-error` to turn any caught API payload into a
display string. Never copy-paste this logic inline.

```ts
import { ApiServiceError } from '$lib/api/api.service';
import { readApiErrorMessage } from '$lib/api/api-error';

try {
  await api.doSomething();
} catch (err) {
  const payload = err instanceof ApiServiceError ? err.payload : err;
  const status  = err instanceof ApiServiceError ? err.status  : 500;
  return fail(status, { error: readApiErrorMessage(payload, m.generic_error()) });
}
```

---

## Data flow between server and client

### Rule: server loads should do exactly one job

A `+page.server.ts` load function has one of two jobs — pick the right one:

| Page type | Server load job | Client job |
|---|---|---|
| **List page** (CwDataTable) | Auth-gate only — return `{}` | `loadData` callback fetches, filters, sorts |
| **Detail / create / edit page** | Fetch the record(s) the page renders | Bind to `data.*`, submit via action |

Never pre-fetch list data server-side that the `CwDataTable.loadData` callback will immediately re-fetch client-side. The server work is wasted and the data is thrown away.

```ts
// ✅ List page — server does nothing except exist (auth gate is in hooks/layout)
export const load: PageServerLoad = async () => {
  return {};
};

// ✅ Detail page — server fetches the specific record
export const load: PageServerLoad = async ({ params, locals, fetch }) => {
  const authToken = locals.jwtString ?? null;
  if (!authToken) return { record: null };
  const api = new ApiService({ fetchFn: fetch, authToken });
  return { record: await api.getRecord(params.id).catch(() => null) };
};
```

### Rule: always use `PageServerLoad`, never `LayoutServerLoad`, in `+page.server.ts`

The generated `$types` file in each route folder exports the correct type. Importing from a
parent folder (`'../$types'`) gives you the layout type, which is wrong for a page.

```ts
// ✅
import type { PageServerLoad } from './$types';
export const load: PageServerLoad = async () => { ... };

// ❌
import type { LayoutServerLoad } from '../$types';
export const load: LayoutServerLoad = async () => { ... };
```

### Rule: always pass `fetchFn: fetch` when constructing ApiService on the server

Without it the server uses the bare global `fetch` instead of SvelteKit's context-aware
fetch, losing request deduplication, cookie forwarding, and relative-URL resolution.

```ts
// ✅ server-side
const api = new ApiService({ fetchFn: fetch, authToken });

// ✅ client-side (no fetchFn — global fetch is correct here)
const api = new ApiService({ authToken: app.accessToken });
```

### Rule: child pages get `authToken` via `await parent()`, not by re-reading `locals`

The root layout (`+layout.server.ts`) is the single source of auth. Layout files that own a
route subtree (e.g. the device layout) forward `authToken` explicitly in their return value.
Page servers under that layout call `await parent()` to receive it.

```ts
// ✅ device/+page.server.ts — gets auth from the device layout
export const load: PageServerLoad = async ({ fetch, params, parent }) => {
  const { authToken, device } = await parent();   // device layout supplies both
  ...
};

// ✅ server actions always read locals directly (actions don't call parent())
export const actions: Actions = {
  default: async ({ request, locals, fetch }) => {
    const authToken = locals.jwtString ?? null;
    ...
  }
};
```

### Rule: reuse parent layout data rather than re-fetching

If a layout already loaded a record (e.g. the device layout fetches the device), child page
servers should consume it from `parent()` instead of calling the API again.

```ts
// ✅ Settings page reuses the device the layout already fetched
const { authToken, device } = await parent();
// No second api.getDevice() call needed
```

### Rule: `authToken` is available on every route via layout inheritance

The root layout returns `authToken` for every route. Client components should read it via
`app.accessToken` (from `getAppContext()`), not by re-returning it in list-page server loads.

---

## i18n

All user-visible strings must use Paraglide message keys. Never hard-code English strings in templates.

```ts
import { m } from '$lib/paraglide/messages.js';

// In templates:
<title>{m.page_title()}</title>
<CwInput label={m.common_name()} placeholder={m.locations_name_placeholder()} />

// In server actions:
return fail(400, { error: m.validation_name_required() });
```

The only exception is debug/developer-only messages (`console.error`, comments).

---

## Layout component reference

| Component | Purpose |
|---|---|
| `<AppPage width="...">` | Full-page wrapper; sets max-width and padding |
| `<AppFormStack padded>` | Vertical flex stack for form fields; `padded` adds inner spacing |
| `<AppActionRow>` | Horizontal row for Cancel + Submit buttons, right-aligned |
| `<AppNotice tone="...">` | Inline feedback box (error, warning, info, success, neutral) |
| `<AppSection>` | Generic vertical flex section |

Import all from `$lib/components/layout`:
```ts
import { AppActionRow, AppFormStack, AppNotice, AppPage, AppSection } from '$lib/components/layout';
```

---

## File conventions

- `+page.svelte` — UI only; no direct DB/API calls (exception: complex wizard forms)
- `+page.server.ts` — `load` function + `actions`; always exports typed `PageServerLoad` / `Actions`
- `+layout.svelte` / `+layout.server.ts` — shared shell, loaded once per layout boundary
- Feature-local sub-components live alongside the page file (e.g., `LocationUpdate.svelte` next to the settings `+page.svelte`)
- Shared reusable components go in `src/lib/components/`

---

## Scrollable list pages

Pages such as `/reports` and `/rules` that render a `CwDataTable` **must remain vertically scrollable on all devices**. The app shell's `.app-shell__main` is the single scroll container (`overflow: auto`). `AppPage` uses `flex: 1 0 auto` (grow but never shrink) so that tall pages force `.app-shell__main` to scroll rather than compressing the content to fit the viewport.

**Rules:**
- Never change `AppPage`'s flex to `1 1 auto` (shrinkable) — that re-breaks scrolling on every page.
- Never put `flex-1` or `min-h-0` on a `CwCard` that wraps a data table — it pins the card to viewport height.

```svelte
<!-- ✅ Card grows with content; page scrolls via app-shell__main -->
<CwCard title={...}>
  <CwDataTable ... />
</CwCard>

<!-- ❌ Card is viewport-height locked; page cannot scroll -->
<CwCard title={...} class="min-h-0 flex-1">
  <CwDataTable ... />
</CwCard>
```

---

## Viewport-fill pages (dashboard exception)

The `/` dashboard is a **viewport-fill** page: it fills the full viewport height and handles its own scrolling internally (the table uses `CwDataTable fillParent`; the card view has its own `overflow-y: auto` scroll container). It does **not** scroll via `.app-shell__main`.

Because `AppPage` globally uses `flex: 1 0 auto` (required for list-page scrolling), the dashboard must override that behaviour with a scoped `:global` style so that `AppPage` and its shell are bounded to viewport height and pass a definite height down the flex chain:

```svelte
<!-- src/routes/+page.svelte -->
<style>
  :global(.app-page.dashboard-page),
  :global(.app-page.dashboard-page .app-page__shell) {
    flex: 1 1 auto;
    min-height: 0;
  }
</style>

<AppPage width="full" class="dashboard-page">
  <div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
    <!-- header (flex-none) + DashboardDeviceTable or DashboardDeviceCards -->
  </div>
</AppPage>
```

**Why this matters — past regression:** Changing `AppPage`'s CSS from `flex: 1 1 auto; min-height: 0` to `flex: 1 0 auto` (no `min-height`) was the correct fix for list-page scrolling, but it silently broke the dashboard because neither the table's internal scroll nor the card view's scroll container received a definite height. The scoped override keeps both modes working without conflict.

**Rules:**
- Never remove the `flex: 1 1 auto; min-height: 0` override from `.app-page.dashboard-page` — doing so will break scrolling in both the table and card views on the dashboard.
- Never change the global `AppPage` flex back to `flex: 1 1 auto` to "fix" the dashboard — that re-breaks scrolling on every other page.
- The dashboard's inner wrapper div **must** keep `flex-1 min-h-0 overflow-hidden` so the bounded height is propagated to the child scroll containers.

---

## Checklist for new pages

### UI
- [ ] Root element is `<AppPage width="...">`
- [ ] If navigated "into": back button is first child of AppPage, `variant="ghost" size="sm"`
- [ ] Form fields are wrapped in `<AppFormStack padded>` inside a `<CwCard>`
- [ ] Errors use `<AppNotice tone="danger">`, not a raw `<p>`
- [ ] Submit/cancel use `<AppActionRow>` as the last item in the form stack
- [ ] All strings use `m.key()` from Paraglide
- [ ] Field state uses `$state(...)`, not `$derived(...)`, for mutable form values
- [ ] No raw `<div style="padding: ...">` or hard-coded pixel values outside a `<style>` block

### Server / data flow
- [ ] `+page.server.ts` uses `PageServerLoad` from `./$types` (not `LayoutServerLoad`)
- [ ] `ApiService` is always constructed with `{ fetchFn: fetch, authToken }` on the server
- [ ] List pages return `{}` from `load` — no pre-fetching data the table re-fetches client-side
- [ ] Detail/edit pages fetch only the record(s) they render; reuse parent layout data where available
- [ ] Child pages under a layout use `await parent()` to get `authToken` and shared data
- [ ] Server actions use `locals.jwtString` directly (actions cannot call `parent()`)
- [ ] Error messages use `readApiErrorMessage` from `$lib/api/api-error`, not inline extraction logic
