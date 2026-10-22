# Cleanup findings: existing bugs found while adding tests

While the `CC-Code-Cleanup` refactor (MVC + dependency injection, ≥ 90 %
coverage) was being tested, the bugs below turned up in the existing code. They
are now **fixed on this branch**, each with a regression test that fails on the
old code, except the one item left open on purpose.

The authentication review (Supabase + SvelteKit) and its fixes are in
[auth-review.md](auth-review.md).

## Still open

| Area         | Finding                                                                                                                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Translations | `ja.json` `auth_terms_of_service` reads 「クッキーポリシーに同意する」 ("Cookie Policy"), but the link opens the Terms of Service (create account, accept terms). Left unchanged at the owner's request. |

## Fixed

### Cross-cutting

- **Error messages.** `apiErrorMessage(err, fallback)` now shows the API's
  message or the translated fallback. A built-in error's text ("Failed to
  fetch", a `SyntaxError`, an abort) never reaches users. Every caught error
  shown to a user goes through it, so these no longer show English
  developer text:
  - the rules and reports wizards, lists, dialogs and the edit-data page;
  - the overview;
  - push removal;
  - the gateways list and the device gateways dialog;
  - device notes and device settings;
  - location settings;
  - the member dialogs.
- **Location settings actions** show the API's own message. Before, they read
  the wrong level of the error envelope and always showed the fallback.

### Account / billing

- Quantities accept whole numbers only: "3.9" no longer buys 3; invalid input disables the action.
- `?checkout=` is removed from the URL after its toast, so a reload does not repeat it.
- A failed device list shows an error in the assign/move dialog instead of "no available devices".
- The dead `{:else if lname}` license-cell branch is removed.

### Rules

- A saved "not equal" (`!=`) condition is no longer saved back as `=`.
  - The alert-points editor (CWUI) has no "not equal" choice, so such a
    condition shows as "Equals", with a notice, and is saved as `!=` until the
    user picks another condition.
  - A real "Not equal" choice needs a CWUI change.
- Relay action checkboxes have per-instance ids (the second label no longer toggles the first). Unused props are removed.
- A failed navigation after a successful save is no longer reported as a failed save. The report wizard and edit-data page had the same bug and are fixed too.
- `getDeviceLabel` and the device-type lookup handle a missing device list.
- The listed dead code is removed. The delete dialog's double-click guard is kept, since it is a real race.

### Reports

- The history dialog no longer retries in a loop after a failure. It loads when opened.
- Old `/reports-new/…` (and `/rules-new/…`) bookmarks keep their query string.
- Data-pull interval labels are localized.
- The edit-data page shows its load-failure message for an empty API body. Its load no longer returns an unused `authToken`.
- The wizard shows why Save is disabled once the form has been edited.

### Locations

- Saving a permission level reads the action result. A refused or failed change shows an error and keeps the row editable; a network error is handled.
- `removePermission` parses its id like its siblings.
- A missing or invalid permission level no longer shows the settings link.
- A new location with id 0 is no longer treated as missing.
- `LocationUpdate.svelte` uses `$state` for its fields.
- The permission placeholder and icon text are localized.

### Device page

- Data refetched in the browser only counts for the device it was asked for.
  This covers the latest reading, relay state, command answers and history.
  The next device no longer shows the previous one's reading, and the relay
  manager keeps asking the relay it was started for.
- A device without a device type loads with the generic display.
- CSV export dialogs cannot be dismissed while an export runs.
- `saveDataNote` shows the translated failure, not "Failed to fetch".
- "DevEUI:" in the header is localized.
- The listed dead code is removed (race guards kept).

### Device displays

- Soil's stat cards use the newest reading, and its trend runs forward in time.
- The Water and Soil tables start with the newest reading, like Air's.
- AirDisplay's never-written state is removed. Readings with an invalid time are left out of the heatmap's day count.
- TodayDataNoteDialog:
  - a failed load has its own message;
  - duplicate timestamps no longer throw;
  - an empty answer shows "no readings".
- Both note dialogs report a saved note as saved and close, even when the follow-up refresh fails. A redirect is followed, and an error result shows its own message.
- Traffic weather sends one request per range (in-flight requests are shared).
- The listed unreachable code is removed.

### Device settings

- The back button and the certificate link follow the device's saved location. The page renders for a device without one.
- The owner card shows the right message for a bad email or level, with no trailing separator.
- `group`, `tti_name` and `location_id` are posted once each, with their normalized values.
- The unused `GET /devices/groups` request is removed. The unused `/api/device-types` endpoint is deleted.
- Certificate downloads get a safe `Content-Disposition` (RFC 5987 for non-ASCII).
- License ids must be whole numbers.
- Deleting a device without a location returns to `/locations`.

### Device create

- A CropWatch label without `dev:` no longer yields its JoinEUI as the DevEUI.
- The QR scanner leaves a stopped stream alone.
- Failed license reloads are handled (logged and announced).

### Overview

- Empty device types take no colour and are not announced.
- An unreadable "last report" time is left out.
- Unnamed locations compare equal, and every row has a unique key.

### Organization admin

- Guest invite expiry:
  - the expiry is the end of the chosen day in the inviter's time zone;
  - an invalid date is a form error, not a 500 page.
- An invalid invite role names the role.
- Staff billing admin:
  - invalid input is a 400 with the right message;
  - seat counts must be whole numbers;
  - non-staff get "forbidden".
- The member dialogs and row buttons show a toast for a failed request and reset their busy state.
- ChangeRoleDialog starts from the member's current role every time it opens.
- The members table's search and pager work.
- `/settings`:
  - this device's stored theme no longer marks the form as changed on load;
  - the load no longer returns options the page never shows (and the unused
    decimal-separator helper is gone).

### Auth

- The logout page is a localized "Log out of CropWatch?" confirmation; signing out itself is a POST (see auth-review.md).
- Login no longer computes and discards a password-strength check. Its reCAPTCHA failure toast matches the other forms.
- The unused `auth-recaptcha` wrapper is removed; the forms use the reCAPTCHA helpers directly.
  - `resetRecaptchaFailureState()` is safe during SSR.
  - A reset during a load no longer lets the old load clear the newer one's state.
- Accept terms uses the redirect its load returns.
- The login page shows why it opened again ("session expired", "signed out", …).
- The create-account and forgot-password links keep `?redirect=` before hydration.

### App shell

- The sidebar's broken session alarm (and its GET to `/auth/logout`) is removed; the layout's expiry watcher sends an expired session to login.
- The error page shows the localized description for the status instead of SvelteKit's English placeholders.
- The dead `updateAppContext()` is removed.
- DashboardCards' "details" loading state resets after navigation.
- DashboardTable's "last updated" uses `formatDateTime`.
- The "clear all client state" logic lives in one helper (`$lib/utils/client-state`).

### Shared library

- `AppPage`'s dead `width` prop is removed; CLAUDE.md no longer describes max-width clamping.
- `depth_cm` has its sensor label.
- `strongPasswordCheck` returns localized messages.
- `getPermissionLevelLabel` shows no label for an unknown value.
- `canRead` and `canManage` accept only valid levels.
- `formatRelative` rounds the same way on both sides of now.
- LanguageSwitcher highlights the chosen language at once.

### Tooling

- e2e: all Chromium tests pass (`npx playwright test --project=chromium`).
  - The tests now set the language cookie instead of racing hydration.
  - They match today's UI: the alerts drawer, PWA dock and header utility
    group were removed from the app on purpose.
  - The app fixes above (reason banner, auth links) made the rest pass.
  - The `webkit-mobile` tests need a WebKit browser, which this container
    does not have.

## Deliberate, documented differences from the refactor

The refactor itself was not byte-for-byte identical at runtime in these places.
None of them changes what a user sees in normal use.

- **Session gates in components.** Device dialogs (gateways, notes, CSV exports), the relay controls and the traffic calendar gate on `app.accessToken` (the same session token, mirrored from page data) instead of a token prop. During the session-expiry redirect the app context is cleared first, so these controls disable — and the calendar shows its "sign in" notice — a moment before the page leaves.
- **Token read per request.** The browser services read the current session token on every request instead of when a client object was built (e.g. a multi-request save picks up a token refreshed mid-loop).
- **Request-scoped fetch on the server.** Every load, action and endpoint calls the API through `locals.services`, built on the request's `event.fetch`. The device layout previously used the global fetch (SvelteKit now adds an `Origin` header the API already receives from every other loader). Loads no longer go through the load's dependency-tracking `fetch`, which only matters for `invalidate(url)` — the app uses `invalidateAll()` only.
