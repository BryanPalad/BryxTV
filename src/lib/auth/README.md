# Better Auth (Phases 5.2–5.3)

Better Auth, its official Prisma adapter, and its official `auth` CLI are pinned
to **1.7.12**. Prisma remains at **7.10.1**. The forms use React Hook Form, Zod 4,
and the official Hook Form Zod resolver. Use Node.js 22 (at least 22.12), matching
`.nvmrc` and GitHub CI; the current auth CLI requires it.

## Configuration and files

- `server.ts`: server-only, lazy Better Auth instance using the existing
  `getPrisma()` singleton and official PostgreSQL Prisma adapter. No duplicate
  database client is created.
- `options.ts`: shared policy for the runtime and offline schema generator.
- `client.ts`: same-origin Better Auth React client. No secret is passed to it.
- `session.ts`: request-memoized server session lookup and `requireSession()`.
  Cookie presence is only a fast guest check; signed cookies and database
  sessions are validated by Better Auth before authorization.
- `validation.ts`, `redirect.ts`, `errors.ts`: input rules, known-local-route
  redirect allowlist, and safe user-facing error messages.
- `/api/auth/[...all]`: official Next.js GET/POST handlers, Node runtime,
  `Cache-Control: no-store`, and sanitized unavailable responses.
- `/register`, `/login`: accessible React Hook Form/Zod forms with visibility
  toggles, loading states, confirmation validation, and safe local redirects.
- `/profile`: dynamically rendered and guarded by a server database session.
  Displays name, email verification status, linked sign-in methods, Google avatar
  (with initials fallback), and account creation date. No profile editing.
- Header account menu: guest login link; authenticated initials, Profile, Logout.
  Mobile navigation includes guest Sign In and Register links.

Existing `.env.local` variables are sufficient: `DATABASE_URL`, `DIRECT_URL`,
`BETTER_AUTH_SECRET` (at least 32 characters), and `BETTER_AUTH_URL`. The auth URL
must be the exact application origin, including the development port. This local
project uses `http://localhost:3001`; use HTTPS for deployment. Non-local HTTP,
URLs with credentials, and unexpected URL paths are rejected. No credentials
were changed or duplicated into source files.

## Behavior and security

Registration requires a 2–60 character display name, valid email, and a
12–128 character password. The confirmation field is checked in the UI. Better
Auth validates and hashes passwords; BryxTV does not implement password hashing.
Server hooks also validate names and login inputs. Names are normalized before
both real and synthetic signup responses to avoid a duplicate-response mismatch.

Registration does not automatically sign in. With `autoSignIn: false`, Better
Auth returns a generic success response for existing emails. Both cases lead to
sign-in with the same message; invalid login does not reveal whether an account
exists. A new account is usable immediately because email delivery and
verification are intentionally not configured. No fake reset/verification flow,
OAuth buttons, or password-reset links are exposed.

Forms use explicit POST fallback semantics and disabled fields before client
hydration. Passwords cannot fall into default GET query strings when JavaScript
is not ready. Auth credentials and session tokens are not stored in localStorage.
Use the normal Video.js browser-local progress independently of authentication.

Sessions live in PostgreSQL, expire after seven days, and are refreshed after a
day of activity. Cookie caching is disabled so protected profile access validates
the live session. Cookies use the `bryxtv` prefix, HttpOnly, SameSite=Lax, and
Secure on HTTPS. Local HTTP development omits Secure. “Remember me” passes the
supported Better Auth boolean; false creates a non-persistent browser session
cookie, while true adds cookie persistence. Browser session restoration behavior
still follows the browser's own settings.

Only the configured origin is trusted. Better Auth's CSRF/origin protections
remain enabled. Cookie settings, hashing, session creation/revocation, and logout
use the supported library methods. Auth changes refresh Next's router state;
logout revokes the current database session and clears its cookie.

The built-in limiter is enabled: 10 sign-ins/minute and 5 signups/minute per
tracked client, plus a general 60-request/minute limit. Storage is process-local;
configure shared rate-limit storage before deploying multiple instances. Do not
trust arbitrary forwarded client-IP headers without a verified deployment proxy.
Raw auth/provider logging is disabled. No passwords, tokens, or secrets are
included in custom application logs.

Browsing, search, title details, TMDB adapters, and authorized demos remain public.
There is no authentication middleware around the catalog. A failed auth session
request does not prevent guest discovery or playback.

## Schema generation and migration

The official CLI generated User, Session, Account, and Verification. Its standalone
output was generated separately, then its model blocks were merged into the
existing Prisma 7 schema while preserving generator output/module format and the
PostgreSQL datasource. Application/CLI connection separation is unchanged.

```sh
npm exec -- auth generate --config scripts/auth-schema.ts \
  --adapter prisma --dialect postgresql \
  --output /tmp/bryxtv-auth-schema.prisma --yes
```

`scripts/auth-schema.ts` loads `.env.local` through `@next/env` and shares the
runtime policy without importing the server-only runtime/client modules. This
uses the official offline generation workflow. The CLI could not load an entry
that imported `server-only`; the runtime protection was kept intact.

Migration: `20261022144500_init_better_auth`.
The SQL was generated with Prisma `migrate diff --from-empty --to-schema ...`,
reviewed, and applied using `prisma migrate deploy` through **DIRECT_URL**. The
previous public schema was empty. SQL creates only the four auth tables, their
indexes and foreign keys; Prisma also manages its migration history table. No
reset, `db push`, unrelated changes, or Better Auth direct SQL migration was used.

For future schema changes, generate/review new Prisma migration SQL before using
`npm run db:migrate:deploy`. Do not rerun an initial empty-schema diff as a plan
for a populated database. Prisma Client generation remains part of `npm ci`.

## Validation and manual testing

```sh
npm run db:validate
npm run db:generate
npm run lint
npm run typecheck
npm test
npm run build
```

The default suite includes validation, password confirmation, error messages,
redirect attacks, policy, and all existing catalog/playback tests. The live suite
is opt-in and requires a local app with a matching BETTER_AUTH_URL:

```sh
BRYX_AUTH_TEST_ORIGIN=http://localhost:3001 npm run test:auth:integration
```

It creates a uniquely named `@example.invalid` account, checks registration,
duplicate handling, CSRF, persistent/non-persistent cookies, server session
retrieval, authenticated profile rendering, forged/absent sessions, and logout.
It deletes only the account it created (exact ID/email), cascading its own auth
records. It also verifies POST forms and disabled pre-hydration fields. No test
account password or cookie is printed. Do not point this test at a deployed site.
Next streamed redirects can use a 200 response with a redirect meta tag; tests
verify the redirect and absence of private profile markup, rather than assuming
all responses have status 307.

Browser check sequence:

1. Open `/register`; test empty inputs and mismatched passwords.
2. Register with a disposable email and a unique password of at least 12 characters.
3. On `/login`, verify a wrong password gives the generic credentials message.
4. Sign in; inspect `/profile`, reload to confirm persistence, and open the account menu.
5. Logout; confirm a fresh visit to `/profile` leads to login.
6. Check the mobile header, forms, keyboard access, visibility toggle, and guest demos.

Email verification/reset delivery, profile editing, watchlists, and history remain
outside this milestone.

## Validation recorded for this phase

Prisma validation/generation, ESLint, strict TypeScript, the 21-test offline suite,
and the production build passed. The live auth suite also passed all checks,
including the POST/hydration regression, normalized duplicates, CSRF, both cookie
persistence modes, database sessions, protected profile access, and logout.
Browser checks covered registration and confirmation errors, generic invalid
login, successful registration/login/profile/logout, a logged-out profile
redirect, mobile layout/visibility toggle, and guest demo playback. Disposable
accounts from automated and browser tests were removed with exact-ID/email scope.
The build was verified with database/auth/TMDB environment values explicitly empty.


## Google Sign-In (Phase 5.3)

The server reads `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from `.env.local`.
Neither is sent as a page prop; the UI receives only a configuration boolean.
If either is missing, Google is disabled and email/password continues working.
The existing `/api/auth/[...all]` handler serves `/api/auth/callback/google`.
No database schema changes or migrations are required: existing User, Account,
Session, and Verification models support this provider.

In Google Cloud Console, use a **Web application** OAuth client and configure:

- Authorized JavaScript origin: the exact `BETTER_AUTH_URL` origin.
- Authorized redirect URI: `<BETTER_AUTH_URL>/api/auth/callback/google`.
- For this project's local port: `http://localhost:3001/api/auth/callback/google`.
- If the consent app is in Testing mode, add the Google account as a test user.

Restart the local server after changing environment variables. Register deployed
origins separately when deployment is ready. Do not copy development database
credentials into production settings.

Both login and registration use `authClient.signIn.social({ provider: "google" })`
with allowlisted internal success/new-user destinations and a local error page.
The button prevents duplicate requests, shows a connecting state, and allows
retry after generic initiation errors. Callback failures never render raw
provider errors, authorization codes, or tokens.

Only default `openid email profile` scopes are requested. Incremental grants are
disabled and access is online; no Drive, Gmail, Calendar, or offline access.
Google email verification is checked using `user.validateUserInfo` against the
fresh provider claim on every OAuth sign-in. It does not rely on the stored local
email-verification flag, which can remain false for password accounts connected
explicitly. Unverified Google identities are rejected even on returning sign-in.
Better Auth manages state, PKCE, token verification, HttpOnly session cookies,
and the existing database-backed sessions. Next development access logs omit
auth callback URLs; deployment proxies must also redact or exclude callback query
strings when hosting is configured. Stored OAuth access/refresh tokens
are encrypted by Better Auth using the configured auth secret; keep it stable.
The existing ID-token field remains server-side in the Account table.

Account linking is enabled with an empty trusted-provider bypass list and
`allowDifferentEmails: false`. Better Auth **1.7.12** requires both the Google
identity and existing local account email to be verified before implicit linking.
Unverified email/password registrations are deliberately not merged into Google
accounts. Their owners can still sign in using their password. Authenticated users can explicitly connect Google from `/profile` after signing
in with their password. This uses Better Auth `linkSocial`, requires a verified
Google identity with the same email, and preserves the existing password.
Returning Google identities are resolved by provider/account ID. Account create/update hooks copy only the Google avatar from the already-verified,
stored ID token; the display URL is restricted to Google HTTPS image hosts and
the token subject must match the linked account. Name and email are not
overwritten. This runs on linking and subsequent Google sign-ins. New Google profiles use the
provider's name, email, verification state, and avatar; rejected or broken avatar
URLs fall back to initials. Only HTTPS `*.googleusercontent.com` images are allowed. The header uses the same
avatar component in a compact size, with initials on missing/broken images.

`npm test` includes Google OAuth initiation/CSRF/redirect tests, simulated
provider identity creation/returning sign-in/linking cases using the official
in-memory adapter, and DOM button tests via `npm run test:auth:ui`. The provider
verification stub exists **only in tests**. Real Google signature validation and
Neon persistence require the manual round trip:

1. Open `/register` and click Continue with Google; complete Google consent.
2. Confirm the callback lands on `/profile` with Google method, verified email,
   name, and avatar. Refresh to check the database-backed session.
3. Log out; sign in with the same Google account from `/login`. Confirm the same
   member-since date and account, then log out and check `/profile` is protected.
4. Cancel the Google flow and verify the local generic retry message.
5. With an existing unverified password account at the same email, confirm Google
   does not silently merge it. Sign in with the password, open Your profile,
   choose Connect Google, and select the same Google email. Then log out and
   verify both Google and password sign-in continue to use the same account.
6. Check the mobile forms and guest `/demos` playback.

Google consent/account selection must be completed by the user. Do not enter real
Google passwords or OTPs into test scripts, capture callback URLs containing
codes, or print OAuth tokens. Documentation references:
[Google provider](https://better-auth.com/docs/authentication/google) and
[account linking](https://better-auth.com/docs/concepts/users-accounts).
