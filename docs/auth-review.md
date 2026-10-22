# Authentication review (Supabase + SvelteKit)

Reviewed on 2026-10-22 against Supabase's current server-side auth guides
(creating a server client, the advanced guide, JWT signing keys, sign-out) and
SvelteKit 2's hooks, form actions and auth documentation. The fixes are on
`CC-Code-Cleanup`; the CropWatch API was not changed.

## How sign-in works

- The browser never talks to Supabase Auth directly. The login form posts to
  the CropWatch API (`PUBLIC_LOGIN_ENDPOINT`, `/auth/login`). The API returns a
  Supabase access token and its expiry.
- The login action stores the token in the `jwt` cookie: httpOnly, Secure on
  https, SameSite=Lax, Path=/, and expiring with the token. There is no refresh
  token, so the session ends when the access token expires.
- Every request passes `hooks.server.ts` (`handle`) before any load, action or
  endpoint runs. The hook verifies the cookie with Supabase Auth and sets
  `locals.jwt` (verified claims) and `locals.jwtString` (the token). Protected
  routes redirect to `/auth/login?redirect=…&reason=…`.
- Password recovery: the Supabase email link goes to `/auth/confirm`
  (`verifyOtp` with the `token_hash`). That sets a 10-minute httpOnly recovery
  cookie and sends the user to `/auth/update-password`, which calls
  `PUT /auth/v1/user`.
- The CropWatch API verifies the token again on every data request. The
  SvelteKit server is the gate for pages; the API is the gate for data.

## Already in line with the guidance

| Practice                                                                                 | Where                                                      |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Auth checked in `handle`, so actions, endpoints and parallel loads are covered           | `src/hooks.server.ts`                                      |
| Session cookie httpOnly, Secure, SameSite=Lax, Path=/, expires with the token            | `src/lib/server/auth/login-action.ts`                      |
| SvelteKit's CSRF origin check on (`csrf.trustedOrigins` not widened)                     | `svelte.config.js` (default)                               |
| A fresh Supabase client per request (`persistSession: false`), never shared module state | `src/lib/server/supabase.ts`                               |
| Email links use `token_hash` + `verifyOtp` (the SSR flow)                                | `src/routes/auth/confirm/+server.ts`                       |
| Password reset does not reveal whether an email has an account                           | `src/routes/auth/forgot-password/+page.server.ts`          |
| `?redirect=` targets restricted to this site's paths                                     | `sanitizeRedirectPath` in `src/lib/utils/auth-redirect.ts` |
| reCAPTCHA Enterprise on sign-in, sign-up and password reset                              | `src/lib/server/recaptcha.ts`                              |
| Unexpected server errors return a generic message                                        | `handleError` in `src/hooks.server.ts`                     |

## Fixed on this branch

| Problem                                                                                                                                                                                                                                                                                                                                          | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **The server trusted any cookie that decoded.** `jwt-decode` read the claims without checking the signature, so a hand-made token got past the page guard as any user or email, staff checks included. Only the API's own check kept data out of reach. Supabase: "Anyone can forge the session cookie… Always use `supabase.auth.getClaims()`." | The hook verifies every token with `auth.getClaims()`. Asymmetric keys are checked against the project's cached JWKS; a legacy HS256 secret is checked by the Auth server. A refused token is deleted and the visitor is sent to login. `jwt-decode` is removed. If Supabase Auth cannot be reached, the session is kept on its decoded claims (logged) rather than signing everyone out; the API still verifies every data request. |
| **Open redirect in `/auth/confirm`.** `?next=https://evil.example` sent users off-site right after they confirmed an email link.                                                                                                                                                                                                                 | `next` is honoured only when it stays on this site; otherwise the user goes to `/auth/login`.                                                                                                                                                                                                                                                                                                                                        |
| **Sign-out was a GET.** Any page could sign users out with a link or an `<img>` (logout CSRF), and sign-out never ended the Supabase session. It also cleared the language cookie.                                                                                                                                                               | `/auth/logout` is a POST form action, covered by SvelteKit's CSRF check. It ends the Supabase session (`scope: 'local'`, so other devices stay signed in), clears the auth cookies (keeping the language), and shows "You signed out" on the login page. A GET only shows a confirmation page. The profile menu and the accept-terms page post to it.                                                                                |
| **The password policy was only checked in the browser.** Sign-up enforced it only in the form; update-password accepted any 6 characters, with English-only messages.                                                                                                                                                                            | `isStrongPassword` is the one policy: shown live in the forms and enforced by the sign-up and update-password actions, with localized messages.                                                                                                                                                                                                                                                                                      |
| Update password could be submitted twice.                                                                                                                                                                                                                                                                                                        | A second submit is cancelled while one is running.                                                                                                                                                                                                                                                                                                                                                                                   |
| The login page never said why it opened ("session expired", "signed out", …). The messages and styles existed, but the banner was not rendered.                                                                                                                                                                                                  | The `?reason=` banner is shown again (`#login-reason-alert`).                                                                                                                                                                                                                                                                                                                                                                        |
| The "sign in" and "back to login" links on create-account and forgot-password lost `?redirect=` before hydration (it was only added by a click handler).                                                                                                                                                                                         | The links carry the redirect in their `href`.                                                                                                                                                                                                                                                                                                                                                                                        |
| reCAPTCHA: a reset during a load could clear the newer load's state, and the reset would throw during SSR.                                                                                                                                                                                                                                       | In-flight handles are cleared only by their own load; the reset is SSR-safe.                                                                                                                                                                                                                                                                                                                                                         |

All of these have unit tests, and the forged-cookie and POST sign-out flows also
have e2e tests (`e2e/auth-login.test.ts`).

## Recommendations (not done)

These need the API, the Supabase project settings or a product decision, so they
were left out of this branch.

1. **Refresh tokens (API change).** The API returns only the access token, so
   users are signed out when it expires. Supabase's SSR pattern keeps the refresh
   token in an httpOnly cookie and refreshes in `handle`. That needs the login
   endpoint to return the refresh token.
2. **Asymmetric JWT signing keys (Supabase dashboard).** Supabase marks the
   legacy JWT secret "no longer recommended". With signing keys, `getClaims()`
   verifies locally against the cached public keys. With the legacy secret, it
   costs one Auth round trip per page request. The migration is
   zero-downtime (Settings → JWT signing keys) and needs no code change here.
3. **Revocation window.** `getClaims()` checks signature and expiry, not whether
   the session was revoked. With asymmetric keys, a signed-out or stolen token
   is still accepted until it expires (Supabase: "Call `getUser()` where that
   gap matters"). Keep access tokens short-lived. For staff-only pages, a
   `getUser()` check could be added.
4. **Password policy (product decision).** Today it is 6+ characters with an
   upper- and lowercase letter, a number and a symbol. Current guidance (NIST
   SP 800-63B) favours a longer minimum and checking against breached
   passwords over composition rules. Supabase Auth can enforce a minimum length
   and leaked-password protection server-side for every client, including the
   API.
5. **Cookie hardening.** Renaming `jwt` to `__Host-jwt` stops subdomains from
   planting or overwriting the session cookie. Everyone would sign in once
   after the deploy.
6. **Legal-terms gate.** The root layout redirects to `/auth/accept-terms`
   when terms are pending, but actions and endpoints are not gated. If
   acceptance must block data changes, the API should enforce it.
7. **Configuration.** `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY` must
   point at the API's Supabase project in every environment. Without them,
   verification is unavailable, and the server logs a warning and falls back
   to the decoded claims on every request.
