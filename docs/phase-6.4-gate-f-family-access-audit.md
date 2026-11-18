# Phase 6.4 Gate F — Family access security audit

Date: 2026-11-17 (Asia/Manila). Branch: `staging`. Audited baseline: `35eeff1e735f38d3563a9be5faebbff23f6d0aa2`.

## 1. Executive summary and decision

**NO-GO for disabling Vercel Authentication. Gate F is not passed for broader family rollout.** The application has substantive server-side family authorization, and the offline/local checks passed. No demonstrated critical authentication bypass or cross-user data leak was found in the audited paths. This is not a claim of exhaustive vulnerability coverage.

Multiple approved family identities are supported by the code. Live verified Google onboarding, removal/revocation, two-user isolation behind the protected Preview, and OAuth return through the stable domain remain unverified. The accidental Production deployment is public and does not enforce the Preview family policy. Keep protection enabled and resolve Production exposure before inviting more testers or considering app-only protection.

No runtime policy changes were made. This audit adds tests and documentation only. No deployment, external configuration change, migration, seed, record mutation, commit or push was performed. `.env.local` and `.env.staging.local` were not edited. The pre-existing `.env.staging.example` change was preserved.

## 2. Evidence and limits

- Inspected application routes, Proxy, auth/session configuration, ownership queries, playback policies and developer CLI guards at the approved commit.
- Used authenticated Vercel CLI 65.16.0: deployment inspect, deployment list and environment-name/scope listings. Did not use env pull, env values/JSON listing, build logs or secret reveal operations.
- Staging alias `bryx-tv-staging.vercel.app` points to Preview deployment `bryx-7kp4shjja-bryanpalads-projects.vercel.app` (`dpl_croYJZs4v23ZiViw1Kmwb6QEXU5b`).
- Production alias `bryx-tv.vercel.app` points to Production deployment `bryx-j6s1fo6k3-bryanpalads-projects.vercel.app` (`dpl_CgveUx4QTG5wrxKUvA9jZfkqpiYJ`); `bryx-tv-bryanpalads-projects.vercel.app` is another alias.
- Both deployment Git metadata records identify branch `staging` and the full approved commit above. A staging Git branch does **not** by itself make a deployment Preview.
- Project: `bryanpalads-projects/bryx-tv`, Next.js, Node 22.x. Protection is reported by the owner as Standard Protection; sampled Preview URLs independently redirect to Vercel SSO. Exact protection scope and all alias exceptions require dashboard confirmation.
- Live checks were anonymous GET requests without tokens, authentication attempts or data mutations. No real family records were inspected.

## 3. Route and endpoint authorization inventory

The classifications below describe **staging/Preview**, where `familyStaging()` is true. Outside that environment the catalog remains intentionally public in current code.

| Routes / operation | Classification | Enforcement / notes |
| --- | --- | --- |
| `/`, `/movies`, `/tv`, `/disney`, `/anime`, `/k-drama`, `/search`, `/credits`, `/demos` | Family-allowlist-required | Proxy validates database-backed session, current membership, verification and expiry before rendering. Public outside staging. |
| `/movie/[id]`, `/tv/[id]`, `/title/[id]` | Family-allowlist-required | Proxy, including direct and RSC requests. |
| `/watch/movie/[id]`, `/watch/tv/[id]`, `/watch/demo/[id]` | Family-allowlist-required | Proxy plus source eligibility/resolution; YouTube remains excluded. |
| `/my-list`, `/history`, `/profile` | Authentication + family required | Proxy plus `getSession`/`requireSession` in server pages; DB queries scoped to session user. |
| Continue Watching on homepage | Authentication + family required | No independent page/API; history retrieval scopes by actual user. |
| `/api/watchlist` GET, POST, DELETE | Authentication + family required | Route supplies session-derived owner to handler; mutation origin checks, strict identifiers, private/no-store responses. |
| `/api/viewing-progress` GET, PUT, DELETE | Authentication + family required | Handler calls `getSession`; owner comes from session, not JSON. Origin/content validation for mutations. |
| `/api/viewing-progress/[mediaType]/[tmdbId]` GET | Authentication + family required | Same history handler, canonical movie/episode/demo identity and session owner. |
| `/api/playback-sources` GET | Family-allowlist-required | Proxy gate; GET handler itself is public outside staging. Only approved source DTOs, no approval evidence/tokens. No HTTP administration methods. |
| `/api/auth/[...all]` GET/POST | Public auth entry; endpoint-specific auth/family enforcement | Proxy intentionally permits callbacks/sign-in. Better Auth hooks reject disallowed identities, account creation, session creation and revoked-session use. Account operations use Better Auth session ownership. Sign-out remains permitted after removal. |
| `/login`, `/register`, `/access-denied` | Public login shell at application layer | Still behind Vercel protection. Staging registration is Google-only; server blocks password signup. Denial page permits sign-out. |
| `/_next/static/*`, `/_next/image`, `/branding/*`, `/favicon.ico`, `/icon.png`, `/apple-icon.png` | Public assets / internal system endpoints at application layer | Intentional Proxy exemptions for login UI. Do not place private data in these assets. Image optimizer can expose public catalog art; app-only protection would not make every asset private. |
| `/media/*`, `/playback/*`, other public files and unknown routes | Family gate | Proxy has no matcher exclusions beyond the explicit login/system exceptions. Unknown routes then resolve to normal 404. |
| Development source preview parameter on watch pages | Developer/local-only | `NODE_ENV=development`, exact localhost host and valid session required. Disabled in production runtime, including Preview. Not an admin permission for family users. |
| `scripts/playback-sources.ts`, content review/discovery tooling | Developer CLI only | Not exposed as routes/actions. Source administration checks both database branch identities and refuses production runtime before writes. Filesystem/CLI access is the developer trust boundary. |

No `use server` actions or debugging/database-inspection HTTP routes were found. Route inventory covers all `page.tsx` and `route.ts` files currently under `src/app`; layouts/error/loading files do not create additional endpoints.

## 4. Better Auth and family allowlist findings

Affected implementation: `src/lib/auth/{options,server,session,family-policy,redirect}.ts`, `src/proxy.ts`, `src/instrumentation.ts`, `src/app/api/auth/[...all]/route.ts`.

- Policy activates on `BRYXTV_ENV=staging` **or** `VERCEL_ENV=preview`. Missing marker does not disable Preview restrictions. A staging marker on Vercel Production is rejected.
- Exact email identities are trimmed and lowercased. No domain wildcard, plus-tag or dot normalization. Empty, malformed and excessive lists fail closed.
- Fresh provider user validation requires verified Google claims; family membership is checked before provisioning/sign-in. New-user and session-create hooks independently recheck policy.
- Password self-registration is blocked server-side for every staging address. Existing password login requires an allowed address and verified account. Do not manually mark identities verified to bypass this restriction.
- Removed identities fail subsequent protected requests and auth account/session endpoints after the updated allowlist reaches the serving deployment. Sign-out remains available. Existing rendered content cannot be recalled; old immutable deployments may retain old policy.
- Session cookie caching is disabled. Proxy validates sessions through Better Auth, not cookie presence; shared server session retrieval checks expiry and family membership too.
- HTTPS auth origins enable Secure cookies; installed Better Auth defaults supply HttpOnly, SameSite=Lax and Path=/ with no cross-subdomain setting. The memory-handler test now verifies Secure/HttpOnly/SameSite on an HTTPS fixture login. Live deployed cookie attributes remain a browser acceptance check.
- Exact configured trusted origin, default Better Auth CSRF checks and callback validation remain enabled. No bypass flags were introduced. `safeReturnTo` restricts post-login destinations to known internal paths and rejects external, encoded separator and malformed URLs.
- OAuth token encryption and conservative same-email verified linking remain enabled. Google scopes remain openid/email/profile. Tests exercise the fresh-provider validation hook with synthetic claims, **not a live Google exchange**.
- Logs are disabled for Better Auth; route failures use generic errors. No token/cookie/credential values were printed during this audit.

## 5. Data isolation and administration

`src/features/watchlist/server.ts` scopes list/find/delete/create operations to the server-supplied user ID. `src/features/history/server.ts` uses the `(userId, contentKey)` composite identity for reads/upserts and includes userId in deletes/list queries. Parameterized SQL binds the owner and progress values. Stale history samples cannot overwrite newer observations.

Handlers reject injected `userId` fields. Profile queries select only provider IDs for the current user's account list, not tokens. Public progress DTOs omit internal row/owner identifiers. My List/history APIs set private/no-store caching; history also varies on Cookie. No shared user-data cache was identified.

Existing watchlist fixtures test Alice/Bob separation. New history-handler fixtures test two-user reads, owner injection, deletion isolation and revoked/anonymous access. These are offline tests with a simulated persistence boundary; production Prisma filters were separately reviewed. They do **not** replace a staged live two-user database test. Live DB-write suites remain skipped because existing integration harnesses explicitly target development, not staging.

Source approval/provider mutation has no browser API. New tests verify no POST/PUT/PATCH/DELETE export on the source route and that developer guards reject production and nonlocal preview access. Normal family membership does not grant CLI/filesystem access. No provider was enabled or approved.

## 6. Staging and Production isolation

Read-only `current_setting('neon.branch_id', true)` checks independently confirmed both local development connections target `br-raspy-sun-az80iq7r` and both local staging connections target `br-sweet-hall-azy18dux`. No hostname-based identity assumption was used. These checks establish the **local files**, not which database Vercel uses.

Vercel's environment-name listing reports these nine variables, all scoped to Preview:

`DATABASE_URL`, `DIRECT_URL`, `STAGING_NEON_BRANCH_ID`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TMDB_READ_ACCESS_TOKEN`, `STAGING_ALLOWED_EMAILS`.

No project environment variables are currently listed for Production. `BRYXTV_ENV` and `NEXT_PUBLIC_APP_URL` are not listed. Preview's system `VERCEL_ENV` activates the family gate without the former; the latter currently affects site metadata defaults and should be reviewed before rollout. No values were retrieved, so the actual deployed auth origin, allowlist contents and database branch cannot be certified. Environment edits also do not retroactively change existing deployments.

Anonymous live results:

| Request | Preview | Production |
| --- | --- | --- |
| `/`, `/login`, `/register` | 302 to Vercel SSO | 200; login/register contain password forms |
| `/profile` | 302 to Vercel SSO | 200 transport response; streaming redirects can use 200, so this is not proof of profile disclosure |
| `/api/watchlist`, `/api/viewing-progress` | 302 to Vercel SSO | 401 |
| `/api/auth/get-session` | 302 to Vercel SSO | 503 generic auth unavailable |
| `/api/playback-sources?mediaType=movie&tmdbId=550` | 302 to Vercel SSO | 503 |

Production has no configured project secrets visible in the current listing and failed the sampled auth/source requests. This is evidence of unavailable services, **not proof that its immutable deployment cannot access a database or has no embedded configuration**. No account-registration POST was made against Production. The form and baseline code expose registration outside staging; successful signup is unverified.

Recommended immediate containment, subject to explicit approval: protect all deployments using a supported setting available to the account, or disable/remove the accidental deployment and aliases. Alternatively deploy an approved secret-free maintenance page. Do not add staging credentials to Production. Review immutable URLs and alternate aliases, not only the primary domain. None of these external changes were made.

## 7. Ranked issues and remediation

| Severity | Finding / evidence | Affected files or configuration | Remediation |
| --- | --- | --- | --- |
| High | Public accidental Production bypasses the family-only browsing policy; registration UI is reachable. No proven account/data compromise. | Production deployment/aliases; `family-policy.ts`, `proxy.ts`, `options.ts`, register page intentionally scope restrictions to staging | Contain Production with explicit owner approval. Do not broaden account policy silently. Verify credentials and all older aliases before rollout. |
| High — assurance blocker | Deployed DB identity, auth origin, actual family policy and live OAuth not independently verified | Preview env/deployment; `server.ts`, `family-policy.ts` | Owner verifies values privately; run trusted read-only deployed-context branch check without public debug endpoints. Complete allowed/denied/revoked-user acceptance. |
| Medium | Protection removal exposes all app auth entrypoints and potentially old deployments; rate limiter is process-local | Vercel settings; `options.ts` rateLimit | Retain outer protection. Before any app-only rollout, review distributed/edge abuse limits and old-deployment revocation. |
| Low / defense-in-depth | Catalog and playback-source confidentiality depend on Proxy; source GET has no duplicate in-handler family guard | `proxy.ts`, `app/api/playback-sources/route.ts` | Retain framework security updates and real-route tests. Consider shared server authorization close to catalog/source data in a separate reviewed change. No demonstrated Proxy bypass found. |
| Low / existing hardening gap | CSP permits inline scripts for hydration, so it is not a strong script-injection mitigation | `next.config.ts` | Consider nonce/hash CSP in a separate compatibility-tested change. No XSS demonstrated here. |

No critical vulnerability was demonstrated. Unknown deployed state is not treated as a passing check. These recommendations do not authorize policy or deployment changes.

## 8. Vercel access strategy comparison

Official documentation reviewed on the audit date:

- [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication): requires Vercel accounts; Hobby permits one external named user per account. Cookies are URL-scoped. Disabling the feature exposes existing deployments in its scope.
- [Shareable Links](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links): Hobby permits one shareable link total per account. Anyone holding it can pass the outer gate without a Vercel account; it is transferable and revocable, not an identity-specific family invitation.
- [Protection scopes](https://vercel.com/docs/deployment-protection): Standard protects everything except Production domains; current docs list All Deployments on all plans. Password protection is unavailable on Hobby. Preview-only protection is described as legacy; no supported inverse “unprotected Preview, protected Production” Hobby configuration was established by this audit. Confirm the actual account UI before proposing such a change.

| Option | Security and usability | Recommendation |
| --- | --- | --- |
| A: Keep Vercel Authentication | Strong outer gate; named access requires Vercel accounts and is limited on Hobby. Does not meet several account-free family testers through named access. | Keep enabled now. |
| B: Supported protected Preview shareable link + BryxTV authorization | Meets account-free outer access; app verifies each family identity. Link leakage reaches the login shell/static assets, not authorized account data if app enforcement holds. One account-level link; no individual link attribution. | Preferred after Production containment and live OAuth/revocation acceptance. Do not generate a link without approval. |
| C: Disable Vercel Authentication and rely on BryxTV | Easier initial access, but public auth attack surface and stale deployments become material. Hobby Preview-only removal with Production retained is not established; global disabling is unacceptable with present exposure. | NO-GO. Requires a separate, evidence-backed design/approval. |

Use one stable Preview hostname throughout Google OAuth, including the exact callback `/api/auth/callback/google`. A share-link token must never be put in Google callback/state URLs, trusted origins or application storage. Test same-host cookie continuity on desktop and Safari/mobile; do not exempt callbacks from protection to make tests pass.

## 9. Changes and validation

Changed by this audit:

- `package.json`: add `test:security` and include it in `npm test`/existing CI. Uses Node's experimental module-mocking flag, no dependency changes.
- `tests/security/access.test.ts`: four new tests exercising real Proxy/handler logic with synthetic auth/persistence boundaries, route/admin restrictions and redirects.
- `tests/family-auth.test.ts`: HTTPS fixture cookie assertions and invalid signed-cookie rejection; retains actual Better Auth memory-adapter login, signup denial, provider-hook and revocation coverage.
- This audit document.

No application behavior or authentication policy was changed. Existing `.env.staging.example` modification remains unrelated/preserved.

Results:

| Check | Result |
| --- | --- |
| ESLint | Passed |
| TypeScript / Next type generation | Passed |
| Prisma schema validation | Passed; no migration command run |
| Core/fixture tests | 86 passed, 6 opt-in live tests skipped |
| UI tests | 21 passed |
| New security tests | 4 passed |
| Production build | Passed with synthetic family list and empty real DB/provider secrets |
| `git diff --check` | Passed |
| Local production HTTP | Protected catalog/profile/library/history/watch/media requests redirect; APIs return 403 with forged cookie + middleware-subrequest/RSC headers; source trailing slash normalizes with 308. Clean guest login/register return 200; register omits password form. Direct password signup returns 403. |
| Local environment branch checks | Both connection pairs match their intended branches via server-reported identity |

**Total automated tests: 111 passed, 0 failed, 6 skipped.** Unit Proxy tests alone do not prove framework-level header handling; local production HTTP tests cover the actual Next entrypoint for sampled routes. Test server uses a non-routable fixture DB target and was stopped after checks.

Skipped/unverified: live database-write integration (development-only harness), live Google consent/callback, real-user revocation and cross-user staging checks, browser share-link continuity, physical mobile/Safari, exact deployed secret values/DB identity and dashboard-only protection exceptions. No external credentials or real family data were used in fixtures. No claim that local tests authenticate a real deployed family account.

## 10. Remaining manual checks and exact next steps

1. **Contain Production first**, with explicit approval. In Vercel project Settings → Deployment Protection, report only the selected protection scope, available scopes and any exceptions. If All Deployments is available as documented, request approval to apply it; otherwise review disabling/removing the accidental deployment or a maintenance replacement. Do not disable Preview protection.
2. In Deployments → each active deployment, verify Environment, Source branch/commit and all assigned domains. CLI already confirms both current commits; verify older/alternate URL access and protection after containment.
3. In Settings → Environment Variables, privately confirm Preview branch scope and values: `BETTER_AUTH_URL` exactly `https://bryx-tv-staging.vercel.app`, both Neon URLs for `br-sweet-hall-azy18dux`, and intended verified family emails. Report only yes/no and scope, never values. Confirm system environment variables are enabled (`VERCEL_ENV=preview`). Review `NEXT_PUBLIC_APP_URL` for the same stable origin. Do not copy staging secrets into Production.
4. Verify deployed DB branch identity in a trusted private server/admin context with read-only SQL; do not add a publicly accessible diagnostic endpoint or infer identity from local env files. Confirm no unapproved cloned personal data before inviting family.
5. Privately verify the Google OAuth client's exact origin/callback and audience/test-user configuration. Test approved verified identity, unapproved identity, repeated login/logout, invalid session, and removal from allowlist after approved redeployment. Synthetic unverified-claim coverage is already automated.
6. Using two explicit staging test accounts, confirm cross-user My List/history isolation and denied source administration. Any test writes must be limited to those accounts and separately approved/configured; current live suites must not be pointed at staging blindly.
7. If choosing B, inspect Deployment → Share and account link usage. Obtain approval before creating/sharing the supported link. Verify same-host OAuth round trip, reload, API requests, mobile/Safari and revocation of old link/deployment access. No bearer link should appear in chat or reports.
8. Reassess Gate F after evidence is recorded. Only then approve additional family testers. App-only access / disabling Vercel Authentication requires a separate decision; it is not authorized by this report.
