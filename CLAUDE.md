# CropWatch — Code Patterns & Conventions

This document is the authoritative reference for how pages, forms, and components are built in this codebase. Follow these patterns when adding or modifying code so everything stays consistent and maintainable.

---

## Tech stack

| Concern        | Tool                                                                  |
| -------------- | --------------------------------------------------------------------- |
| Framework      | SvelteKit 2 + Svelte 5 (runes mode)                                   |
| Language       | TypeScript                                                            |
| Styles         | Tailwind CSS 4 + design-token CSS vars                                |
| UI library     | `@cropwatchdevelopment/cwui` (`CwXxx` components)                     |
| Layout helpers | `$lib/components/layout` (`AppXxx` components)                        |
| i18n           | Paraglide — always `import { m } from '$lib/paraglide/messages.js'`   |
| Data access    | Repositories, injected: `locals.services` (server), `getServices()`   |
| Config         | `$lib/config/public` and `$lib/server/config` — never `$env` direct   |
| Auth           | Supabase JWT, verified per request; `locals.jwt` / `locals.jwtString` |

---

## Architecture (MVC + dependency injection)

Every read and write of data goes through one path, so it is predictable,
traceable and mockable:

```
View (.svelte)  ──calls──▶  Controller  ──calls──▶  Model (repository)  ──▶  HttpClient  ──▶  CropWatch API
                            +page.server.ts          $lib/api/repositories    FetchHttpClient
                            *.svelte.ts controller   (interface + Http impl)
```

| Layer      | Lives in                                                                                               | Rule                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Model      | `$lib/api/repositories/*.repository.ts`, `$lib/api/api.dtos.ts`                                        | One repository per API resource: an interface + `Http…Repository`. Only repositories know URLs. |
| Controller | `+page.server.ts` / `+layout.server.ts` / `+server.ts`; `*.svelte.ts` classes for complex client state | Validates input, calls repositories, maps results/errors. No markup.                            |
| View       | `.svelte`                                                                                              | Renders state, forwards user intent. No URLs, no `fetch`, no `new …Repository`.                 |

**Dependency injection.** Nothing constructs its own data access. The
composition roots build it once and inject it:

- **Server:** `hooks.server.ts` builds request-scoped `locals.services`
  (`createServerServices`) with the request's `event.fetch` and the session
  token. Loads, actions and endpoints use `locals.services.<repository>`.
- **Browser:** the root `+layout.svelte` calls `setServices(createClientServices(…))`.
  Components call `getServices()` during initialisation.
- **Plain modules and controllers** take what they need as constructor or
  function parameters (e.g. `new OverviewRanges({ fetcher })`).

`AppServices` (`$lib/services/app-services.ts`) lists every repository. To add an
endpoint: add the method to the repository interface and its `Http…` class, add
a row to `$lib/testing/repository-contract.ts`, and call it through the services.

Never: `fetch(apiUrl)` in a page or component, a hand-built API client,
`new Http…Repository(...)` outside a composition root, or reading `$env/*`
outside `$lib/config` / `$lib/server/config`. (A component may still `fetch('?/action')`
its own page's form action — that calls the page's controller, not the API.)

---

## Page structure

Every authenticated app page must use `<AppPage>` as its root. Never use a raw `<div>` container with hard-coded padding instead.

```svelte
<AppPage>...page content...</AppPage>
```

`AppPage` fills the content column (no max-width), with consistent horizontal padding and a vertical flex column with `gap-4` between direct children. Do not add extra padding or gap on the shell div inside.

---

## Back navigation

Every page that can be reached by navigating "into" something (create, edit, settings, detail) must show a back button as the **first child** of `<AppPage>`, before any cards or content.

**Always use:**

```svelte
<CwButton variant="secondary" size="sm" onclick={() => goto(resolve('/target-route'))}>
	&larr; {m.action_back()}
</CwButton>
```

- `variant="secondary"` keeps it visually quieter than the page's primary action.
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
	default: async ({ request, locals }) => {
		const authToken = locals.jwtString ?? null;
		if (!authToken) return fail(401, { error: m.auth_not_authenticated() });

		const formData = await request.formData();
		// validate, then call a repository:
		try {
			await locals.services.locations.updateLocation(id, fields);
			return { success: true };
		} catch (err) {
			return fail(apiErrorStatus(err), {
				error: apiErrorMessage(err, m.generic_error()),
				...fields
			});
		}
	}
};
```

**On validation failure** — return `fail(400, { error: '...', ...echoedFields })` so the form can re-populate. Always echo field values back so the user does not lose their input.

### Direct API calls (complex wizard forms)

When a form has complex dynamic client-side state that cannot be expressed as flat HTML form fields (e.g., multi-step wizards with dynamic criteria lists), submit directly from the component via a `handleSubmit` async function. The rules create/edit pages are the canonical example.

```ts
const { rules } = getServices();

async function handleSubmit() {
	if (!isFormValid || submitting) return;
	submitting = true;
	try {
		await rules.createRuleTemplate(payload);
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

| Situation                                     | Tone      |
| --------------------------------------------- | --------- |
| Server action validation failure              | `danger`  |
| User needs to fix something before proceeding | `warning` |
| Informational (e.g., no devices found)        | `neutral` |
| Summary / preview                             | `info`    |

```svelte
<AppNotice tone="danger">
	<p>{form.error}</p>
</AppNotice>
```

For validation issue lists (multiple items), show them as a `<ul>` inside the notice body and set `ariaLive="polite"`.

---

## Don't wrap one-liners used once

A function whose body is a single trivial expression — a ternary, a `??` chain, a
template string — and that is called exactly once is **bloat**. It forces a reader to
jump to the definition and back for no gain. Inline the expression at the call site.

```svelte
<!-- ❌ single-use trivial wrapper -->
<script>
	function statusFor(row) {
		return row.latest ? 'online' : 'loading';
	}
</script>

<CwSensorCard status={statusFor(row)} />

<!-- ✅ inlined -->
<CwSensorCard status={row.latest ? 'online' : 'loading'} />
```

Use a named function only when it is **reused** (2+ call sites), **multi-statement**,
or a genuine **multi-branch mapper** (a `switch` / 3+ `if` — inlining those as nested
ternaries hurts readability more than the wrapper does). In Svelte templates, prefer
`{@const}` over a helper function for per-row derived values.

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
let deviceOptions = $derived(data.devices.map((d) => ({ label: d.name, value: d.dev_eui })));
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

### Server-side (loads, actions, `+server.ts`)

```ts
export const load: PageServerLoad = async ({ locals, params }) => {
	const { gateways } = locals.services;
	return { gateway: await gateways.getGateway(params.gateway_id).catch(() => null) };
};
```

`locals.services` is already bound to this request's `event.fetch` and session
token — never construct a client or pass a token yourself.

### Client-side (in `.svelte` components)

```ts
const { gateways } = getServices(); // during component initialisation

async function loadData(query: CwTableQuery) {
	return buildRows(await gateways.getGateways({ signal: query.signal }), query);
}
```

The services send the current session token on every request (`app.accessToken`
at call time). Use `app.accessToken` only as a "signed in?" gate, never to pass a
token around; components do not take an `authToken` prop.

### Error handling

Use the helpers in `$lib/api/api-error`. Never copy-paste extraction logic inline.

```ts
import { apiErrorMessage, apiErrorStatus } from '$lib/api/api-error';

try {
	await locals.services.organizations.renameOrganization(orgId, name);
} catch (err) {
	return fail(apiErrorStatus(err), { error: apiErrorMessage(err, m.generic_error()) });
}
```

- `apiErrorStatus(err, fallback = 500)` — the API's status, or `fallback` for any other error.
- `apiErrorMessage(err, fallback)` — the API's message, else `fallback`. A plain `Error` our own
  code throws keeps its (localized) message; a built-in error (`TypeError: Failed to fetch`,
  `SyntaxError`, an abort…) never reaches the user — it gives `fallback`.
- Never pass a raw caught error to `readApiErrorMessage` (it would show "CropWatch API request
  failed (500 …)" for an API error without a message).
- `ApiError` is what every repository throws for a non-2xx response (`status`, `payload: { url, payload }`).

---

## Authentication

- **Session**: the login action (`$lib/server/auth/login-action.ts`) signs in through the
  CropWatch API and stores the Supabase access token in the httpOnly `jwt` cookie (it lives
  as long as the token) and the refresh token in `jwt_refresh` (30 days, reset on every
  refresh) — via `setSessionCookies` (`$lib/server/auth/session-cookies`).
- **Renewal**: `hooks.server.ts` renews the session with the refresh token when the access
  token is missing or has under 10 minutes left (`refreshIfDue`; a refused refresh token is
  deleted). The browser keeps up by invalidating `app:session` (the root layout load's
  dependency) 5 minutes before expiry (`createSessionExpiryWatcher`'s `onRenew`), so the new
  token reaches `app.accessToken`; only when that brings no later expiry is the user sent to
  login. Constants: `$lib/auth/session-renewal`.
- **Every request** passes `hooks.server.ts`, which verifies that token with Supabase Auth
  (`locals.services.supabaseAuth.verifyAccessToken` → `auth.getClaims()`: signature against
  the project's signing keys, or the Auth server for a legacy secret) before any load,
  action or endpoint runs. Protected routes redirect to login without a valid session; a
  refused token is deleted. `locals.jwt` holds the **verified** claims, `locals.jwtString`
  the token. Never decode the cookie yourself or trust unverified claims.
  (If Supabase Auth is unreachable the session is kept on its decoded claims — the API
  still verifies every data request — rather than signing everyone out.)
- **Sign out** is the POST form action at `/auth/logout` (it also ends the Supabase
  session): a `<form method="POST">`, or `signOut(buildLogoutPath(...))` from
  `$lib/auth/sign-out` in script. Never a link or `location.href` to `/auth/logout`.
- **Passwords**: `isStrongPassword` (`$lib/utils/strongPasswordCheck`) is the one policy —
  the forms show it live and every action that sets a password enforces it.
- **Redirect targets** from the URL (`?redirect=`, `?next=`) go through
  `sanitizeRedirectPath` / a same-origin check — never straight into `redirect()`.

---

## Data flow between server and client

### Rule: server loads should do exactly one job

A `+page.server.ts` load function has one of two jobs — pick the right one:

| Page type                       | Server load job                      | Client job                                  |
| ------------------------------- | ------------------------------------ | ------------------------------------------- |
| **List page** (CwDataTable)     | Auth-gate only — return `{}`         | `loadData` callback fetches, filters, sorts |
| **Detail / create / edit page** | Fetch the record(s) the page renders | Bind to `data.*`, submit via action         |

Never pre-fetch list data server-side that the `CwDataTable.loadData` callback will immediately re-fetch client-side. The server work is wasted and the data is thrown away.

```ts
// ✅ List page — server does nothing except exist (auth gate is in hooks/layout)
export const load: PageServerLoad = async () => {
	return {};
};

// ✅ Detail page — server fetches the specific record
export const load: PageServerLoad = async ({ params, locals }) => {
	const authToken = locals.jwtString ?? null;
	if (!authToken) return { record: null };
	return { record: await locals.services.records.getRecord(params.id).catch(() => null) };
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

### Rule: server code uses `locals.services`, never its own client

`hooks.server.ts` builds `locals.services` with SvelteKit's request-scoped
`event.fetch` (cookie forwarding, relative URLs) and the session token, so every
load, action and endpoint talks to the API the same way.

```ts
// ✅ server-side
const { devices } = locals.services;

// ✅ client-side
const { devices } = getServices();
```

### Rule: child pages get `authToken` via `await parent()`, not by re-reading `locals`

The root layout (`+layout.server.ts`) is the single source of auth for page data.
Layout files that own a route subtree (e.g. the device layout) forward `authToken`
explicitly in their return value. Page servers under that layout call
`await parent()` for it and use it as their "signed in?" gate; the data itself
still comes from `locals.services`.

```ts
// ✅ device/+page.server.ts — auth gate and device from the device layout
export const load: PageServerLoad = async ({ locals, params, parent }) => {
  const { authToken, device } = await parent();   // device layout supplies both
  if (!authToken) return { ... };
  const latest = await locals.services.telemetry.getDeviceLatestData(params.dev_eui);
  ...
};

// ✅ server actions always read locals directly (actions don't call parent())
export const actions: Actions = {
  default: async ({ request, locals }) => {
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

The root layout returns `authToken` for every route; the root `+layout.svelte`
mirrors it into `app.accessToken`, and the client services send it. Do not
re-return it from list-page server loads, and do not pass it to components.

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

| Component                | Purpose                                                          |
| ------------------------ | ---------------------------------------------------------------- |
| `<AppPage>`              | Full-page wrapper; sets padding and the page column              |
| `<AppFormStack padded>`  | Vertical flex stack for form fields; `padded` adds inner spacing |
| `<AppActionRow>`         | Horizontal row for Cancel + Submit buttons, right-aligned        |
| `<AppNotice tone="...">` | Inline feedback box (error, warning, info, success, neutral)     |
| `<AppSection>`           | Generic vertical flex section                                    |

Import all from `$lib/components/layout`:

```ts
import { AppActionRow, AppFormStack, AppNotice, AppPage, AppSection } from '$lib/components/layout';
```

---

## File conventions

- `+page.svelte` — View: UI only; data comes from `data`, from `getServices()` repositories (list tables, wizards), or from a controller
- `+page.server.ts` — Controller: `load` function + `actions`; always exports typed `PageServerLoad` / `Actions`; data via `locals.services`
- `*.svelte.ts` — client controllers (stateful classes with injected dependencies)
- `$lib/api/repositories/` — Model: the only code that knows API URLs
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
<AppPage class="dashboard-page">
	<div class="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
		<!-- header (flex-none) + DashboardDeviceTable or DashboardDeviceCards -->
	</div>
</AppPage>

<!-- src/routes/+page.svelte -->
<style>
	:global(.app-page.dashboard-page),
	:global(.app-page.dashboard-page .app-page__shell) {
		flex: 1 1 auto;
		min-height: 0;
	}
</style>
```

**Why this matters — past regression:** Changing `AppPage`'s CSS from `flex: 1 1 auto; min-height: 0` to `flex: 1 0 auto` (no `min-height`) was the correct fix for list-page scrolling, but it silently broke the dashboard because neither the table's internal scroll nor the card view's scroll container received a definite height. The scoped override keeps both modes working without conflict.

**Rules:**

- Never remove the `flex: 1 1 auto; min-height: 0` override from `.app-page.dashboard-page` — doing so will break scrolling in both the table and card views on the dashboard.
- Never change the global `AppPage` flex back to `flex: 1 1 auto` to "fix" the dashboard — that re-breaks scrolling on every other page.
- The dashboard's inner wrapper div **must** keep `flex-1 min-h-0 overflow-hidden` so the bounded height is propagated to the child scroll containers.

---

## Installed app (PWA)

- **Service worker** (`src/service-worker.ts`): registered by `PwaDock` in production builds
  only (`kit.serviceWorker.register` stays `false`). At install it caches just the offline
  page and its stylesheets; content-hashed `/_app/immutable/*` files are cached as the app
  uses them. Never precache SvelteKit's `build`/`files` lists: `static/` holds multi-MB
  source icons, and every deploy would re-download it all on every phone. Navigations are
  network-first (with navigation preload) and fall back to the offline page.
- **Offline page** (`/offline`): server-rendered **without a session** (`SESSIONLESS_PATHS`
  in `hooks.server.ts`) because the worker caches it, and `csr = false` because it is shown
  at whatever URL failed — it must work as plain HTML and CSS.
- **Push** (`static/push-sw.js`, scope `/push-sw/`): tapping an alert focuses an open app
  window and posts `cw:navigate` to it (`PwaController` opens the page) instead of a new window.
- **`PwaDock` / `PwaController`** (`$lib/components/pwa`, `$lib/pwa`): install prompt
  (Chromium), Add to Home Screen hint (iPhone/iPad — push only works there once installed),
  "new version" notice (`updated` + `kit.version.pollInterval`), app icon badge.
- **Assets**: the maskable icons (Android's home screen icon and launch screen) and the iOS
  launch images (screens listed in `src/lib/pwa/apple-splash-screens.json`) are drawn from
  the SVG logo by `node scripts/generate-pwa-images.mjs` — never upscale a small PNG for them. Manifest screenshots (fictional
  demo data) — regenerate with `node scripts/capture-pwa-screenshots.mjs` while
  `node scripts/e2e-stack.mjs` is serving.

---

## Client controllers

When a component's script grows real behaviour — several async operations,
request ordering, polling, multi-step state — move it into a controller: a
class in a `*.svelte.ts` file next to the component, holding `$state` and
methods, with every dependency passed to its constructor. The component
creates it once and renders its state. Canonical examples: `OverviewRanges`
(`routes/overview/overview-ranges.svelte.ts`) and `DeviceSetupFlow`
(`routes/locations/[location_id]/devices/create/device-setup-flow.svelte.ts`);
also `DeviceDashboard` (device page), `RuleTemplateFormController` (rule wizard),
`BillingController` (account billing) and `LocationLiveReadings` (location page).

```ts
// thing-controller.svelte.ts
export class ThingController {
	items = $state<ThingDto[]>([]);
	constructor(private readonly deps: { things: ThingRepository; onError: (msg: string) => void }) {}
	async load() { ... }
}

// Thing.svelte
const controller = new ThingController({ things: getServices().things, onError: (message) => toast.add({ tone: 'danger', message }) });
```

Pure logic (mapping, formatting, validation) goes in a plain `.ts` module, not a
class. Keep small one-off handlers inline (see "Don't wrap one-liners used once").

---

## Testing

Every source file under `src/` counts toward coverage (`pnpm test:coverage`):
a coverage run fails below 90 % statements, branches, functions or lines (the
thresholds in `vite.config.ts`; CI runs it on every push). Unit tests can
**never** touch real data: the setup file `$lib/testing/setup.ts` refuses every
network request a test did not fake, and fails the test.

| Testing a…                   | Use                                                                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| load / action / `+server.ts` | `testEvent<Parameters<typeof load>[0]>({ locals: testLocals(), params, parent, request: formRequest({...}) })` — stub `locals.services.<repo>.<method>` |
| component / page             | `renderWithServices(Component, { props, services: createMockServices(), app: { accessToken: 'jwt' } })` in a `*.svelte.spec.ts` (browser)               |
| repository / HTTP shape      | `createFakeFetch(responder)` with `FetchHttpClient`, or add a row to `repository-contract.ts`                                                           |
| controller class             | construct it with mocks directly                                                                                                                        |

- Name specs for route modules `page.server.spec.ts`, `page.svelte.spec.ts` (the
  `+` prefix is reserved by SvelteKit).
- An unstubbed mock-service call rejects with "…was called but not stubbed".
- Mock `$app/navigation` with `vi.mock` when a test clicks something that navigates.
- A component that posts to its own page action (`fetch('?/…')`, `submitPageAction`):
  `vi.stubGlobal('fetch', createFakeFetch(...).fetch)`, restored with `vi.unstubAllGlobals()`.
- A node spec whose module imports components (e.g. the display registry) stubs
  those component modules with `vi.mock`; components are tested in the browser.
- e2e tests (`pnpm test:e2e`) run against the local mock API in `scripts/e2e-stack.mjs`.

---

## Environments

Development, staging and production are separate env files with the same keys
(`.env.development`, `.env.staging`, `.env.production`, all gitignored; keys in
`.env.example`). The Vite mode picks the file: `pnpm dev` (development),
`pnpm dev:staging`, `pnpm build` (production), `pnpm build:staging`. On Vercel,
set the values per Vercel environment. `PUBLIC_APP_ENV` names the environment
explicitly (`readPublicConfig().environment`). Read env only through
`readPublicConfig()` / `readServerConfig()` (runtime values) and
`readFirebaseConfig()` (`$lib/config/firebase`, build-time values).

---

## Checklist for new pages

### UI

- [ ] Root element is `<AppPage>`
- [ ] If navigated "into": back button is first child of AppPage, `variant="secondary" size="sm"`
- [ ] Form fields are wrapped in `<AppFormStack padded>` inside a `<CwCard>`
- [ ] Errors use `<AppNotice tone="danger">`, not a raw `<p>`
- [ ] Submit/cancel use `<AppActionRow>` as the last item in the form stack
- [ ] All strings use `m.key()` from Paraglide
- [ ] Field state uses `$state(...)`, not `$derived(...)`, for mutable form values
- [ ] No raw `<div style="padding: ...">` or hard-coded pixel values outside a `<style>` block

### Server / data flow

- [ ] `+page.server.ts` uses `PageServerLoad` from `./$types` (not `LayoutServerLoad`)
- [ ] Data access goes through `locals.services` (server) / `getServices()` (client) — no `fetch` to the API, no client construction
- [ ] List pages return `{}` from `load` — no pre-fetching data the table re-fetches client-side
- [ ] Detail/edit pages fetch only the record(s) they render; reuse parent layout data where available
- [ ] Child pages under a layout use `await parent()` to get `authToken` and shared data
- [ ] Server actions use `locals.jwtString` directly (actions cannot call `parent()`)
- [ ] Errors use `apiErrorStatus` / `apiErrorMessage` from `$lib/api/api-error`, not inline extraction logic

### Tests

- [ ] Every new load, action, endpoint, controller and component has a spec (≥ 90 % coverage)
- [ ] Specs inject mocks (`testLocals`, `createMockServices`, `createFakeFetch`) — never `vi.mock` a repository module and never a real network
