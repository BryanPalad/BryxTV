# Phase 6.4 — Vercel private family staging

Prepared 2026-11-10. **Gate A: implementation review only. No deployment or external configuration performed.** This replaces Phase 6.3's one-named-tester proposal with the explicitly requested shareable-link plus verified-family-authorization design. Existing uncommitted work is preserved.

## Access architecture

Family member → Vercel Standard Deployment Protection / one revocable shareable Preview link → BryxTV login → verified, allowlisted Better Auth identity → server-authorized catalog and owner-scoped data.

[Vercel documents one shareable link per Hobby account](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection/sharable-links), and [one externally granted named user on Hobby](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication). These are separate access mechanisms. The link is a transferable bearer credential, not an identity check. Anyone receiving it may reach the login shell and public static assets; they must still pass the application's verified-email policy to browse or access data. Never put the link in Git, logs, screenshots, analytics, or public messages. Do not use an automation bypass secret for family access.

Use a **Preview deployment only**, on a separate staging project. Standard protection must stay enabled, with no callback/API/domain exceptions. No Production deployment or promotion is part of this plan. Hobby is $0 within [personal/noncommercial plan limits](https://vercel.com/docs/plans/hobby); Neon quotas are separate. No paid resources or upgrades have been authorized. If the account's single shareable link is already used elsewhere, stop rather than revoke unrelated access.

## Server-side family policy

`STAGING_ALLOWED_EMAILS` is a server-only comma-separated list of exact email identities (maximum 100 entries). Trim and lowercase consistently; do not remove dots or plus tags, infer aliases or allow whole domains. Empty/malformed lists fail closed. Examples contain placeholders only.

The policy activates when `BRYXTV_ENV=staging` **or** Vercel sets `VERCEL_ENV=preview`; accidentally omitting the marker on Preview cannot disable it. Staging marked as Vercel Production is rejected. Next instrumentation validates the list before the instance serves requests. Better Auth and request guards also validate it.

- New family users use verified Google sign-up. The fresh Google email claim must be verified and an exact allowlist member before provisioning or login.
- **Password self-registration is disabled entirely in staging**, including direct POST requests and listed addresses. There is no email-delivery verification service; allowing an unverified invited address to register would permit address claiming. Existing non-staging registration is preserved.
- Existing password accounts can sign in only when allowlisted and already email-verified. Do not mark identities verified merely to pass a test. A fresh staging database plus verified Google onboarding avoids pre-existing unverified-account linking conflicts. Non-Google onboarding requires a separately reviewed identity-verification/invitation workflow; it is not implemented here.
- Better Auth hooks enforce registration, provider identity and session creation, and check current session membership on auth endpoints. Revoked users may still sign out. Session cookie caching remains disabled.
- Next Proxy gates catalog pages, navigation/RSC requests, playback media and application APIs. The login/register/access-denied shell, auth endpoints, Next static/image assets and branding are allowed through this application gate; auth endpoints enforce their own hooks. These remain behind Vercel protection.
- Shared server session retrieval rechecks verified membership and expiry. My List/history still derive ownership from the actual session, never request-supplied user IDs. Existing records are not deleted when membership is removed.
- The access-denied page allows signing out/switching accounts. Errors never disclose the allowlist. The client receives only generic copy, not membership data.

Revocation takes effect on subsequent requests **after the updated environment is deployed to the serving instance**. Vercel environment edits do not mutate existing deployments. Previously rendered pages cannot be recalled from a browser; no new protected data should be served after revocation. Old immutable deployments retain their old configuration until access is revoked or they are removed through an approved external action.

## Environment and runtime checklist

Use `.env.staging.example` as a checklist. Next does not automatically load `.env.staging`. Keep `NODE_ENV=production` for deployment, not `staging`. Set server values in the project's Preview environment, scoped to Git branch `staging` where available.

| Variable | Requirement |
| --- | --- |
| BRYXTV_ENV | staging at build and runtime |
| STAGING_ALLOWED_EMAILS | exact verified family addresses; server-only |
| NEXT_PUBLIC_APP_URL | stable HTTPS Preview origin; sole public configuration value |
| BETTER_AUTH_URL | same exact origin, no path/query/credentials |
| BETTER_AUTH_SECRET | new random staging secret, at least 32 characters; never reuse production |
| DATABASE_URL | pooled connection to dedicated staging database, TLS |
| DIRECT_URL | direct connection to the same database/branch, TLS |
| STAGING_NEON_BRANCH_ID | independently confirmed staging branch ID |
| GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET | separate staging Web OAuth client |
| TMDB_READ_ACCESS_TOKEN | server-only discovery token |

No YouTube/Mux/AniList credentials are required. Never use NEXT_PUBLIC for secrets or the allowlist. `.env.local` and actual env files remain ignored. Node 22 at least 22.12 (or validated Node 24); Next 16.4.2, Prisma 7.10.1, Better Auth 1.7.12. The existing lockfile remains authoritative. `npm ci` generates Prisma Client via postinstall; `npm run build` produces the server app. Never static-export this app. No new dependencies or schema changes are necessary.

`npm run staging:check` checks explicitly injected settings without loading `.env.local`: list validity, HTTPS origins, required secrets, matching TLS Neon URLs and read-only live branch identity for both connections. It prints no credentials. The caller must independently confirm that STAGING_NEON_BRANCH_ID is genuinely staging; matching a supplied ID does not by itself prove non-production. No migration is run by this checker.

## Neon staging — Gate C

Both current `.env.local` connections were rechecked read-only on 2026-11-10 and target **development br-raspy-sun-az80iq7r**. They are NOT a confirmed dedicated staging branch. No Neon management resources were listed or changed. No production records were copied and no migration was applied.

After explicit Gate C approval, inspect existing branches in the correct Neon project. Prefer an empty/schema-only staging database initialized with the reviewed migrations, rather than a data clone of production or development (development was historically cloned from production). Do not assume a regular branch clone excludes users, password hashes or encrypted provider tokens. If the available Neon workflow cannot create the desired data-free branch, stop and review an empty database/project or schema-only workflow before creating it. Do not reset or purge an existing database.

Independently record staging identity and matching pooled/direct URLs. Use a dedicated database role with only necessary application privileges. Verify both connections before any migration. Existing migrations are init_better_auth, add_persistent_watchlist, add_viewing_progress and add_playback_providers. Applying them requires explicit approval distinct from branch creation. Use the existing Prisma DIRECT_URL workflow with only verified staging values; never run migrate/reset/db-push at build or startup. No production fallback.

## GitHub and Vercel — Gates B, D and E

1. Gate B: review current working diff, choose the reviewed feature branch/commit, then explicitly approve commit and push/merge to GitHub `staging`. Existing CI checks main/staging/PR/manual; no deploy workflow was added.
2. Gate D: authorize creation/configuration of the separate Vercel project and repository connection. Select Next.js, npm, Node 22, install `npm ci`, build `npm run build`; default Next output/runtime. Do not provide production secrets.
3. Configure Standard Deployment Protection before deployment, Preview env settings, branch-specific staging origin and Git restrictions. Git import may immediately create a deployment: stop at the final import/deploy action until Gate E is approved. Do not set `staging` as Vercel's Production branch.
4. Restrict builds to Preview `staging`. If Git deployment is enabled, configure the ignored-build rule so only `VERCEL_ENV=preview` AND `VERCEL_GIT_COMMIT_REF=staging` builds; exit 1 to build, 0 to skip in Vercel's ignored-build convention. Verify the convention in the dashboard before applying. Exclude main and all other branches. Keep automatic deployment disabled until first-deployment approval.
5. Gate E: deploy the reviewed staging revision as Preview. Never use `--prod`, promote to Production, or configure a public production alias. Check the exact stable branch alias; do not hardcode generated deployment URLs in source.
6. Once the protected deployment exists, Gate D approval must explicitly cover creating its single shareable link: select Preview deployment → Share → Anyone with the link. This materially expands outer-gate access. Do not create it implicitly as part of a code push.
7. Inspect all aliases and immutable URLs anonymously before inviting anyone. Verify Preview protection covers pages, APIs and assets. Then complete the application and OAuth acceptance checks below.

If GitHub connection cannot be configured without triggering a deployment, combine the review of the configuration and intended first deployment, but request each gate's approval explicitly. No external changes have been made in Gate A.

## Google OAuth and shareable-link compatibility — Gate D

Use a separate Google Web OAuth client. In Google Auth Platform, configure intended audience/test users; add authorized JavaScript origin `https://<stable-preview-host>` and exact redirect URI `https://<stable-preview-host>/api/auth/callback/google`. No wildcard, production replacement, or temporary URL in code. Set matching Better Auth/public origins, new secret and the client credentials in Preview secrets. Only openid/email/profile scopes remain enabled.

Existing Better Auth uses exact trusted origins, HTTPS secure host-only cookies, seven-day sessions/daily refresh, database validation, encrypted OAuth tokens and conservative verified-email linking. CSRF remains enabled. A dedicated staging DB/secret/host isolates sessions. Copying encrypted account tokens from another environment is unsupported here and may require relinking; do not reuse production secrets to make them decrypt.

**Compatibility is not yet verified.** Vercel documents shareable-link access, but that alone does not prove persistence across Google redirects or Safari cookie behavior. On the same stable hostname, open the link, sign in, complete Google consent, return through the protected callback, refresh, navigate with Next, and call authorized APIs. Never append a share token to Google redirect_uri/state/callback URLs, copy it into app storage, add it to trusted origins, or expose an automation bypass secret.

If OAuth loses the outer protection session or redirects to another unapproved hostname: record sanitized status/host/path only, stop invitations, and report the precise failing step. Do not disable protection or exempt the callback. A supported fallback is named Vercel Authentication for owner plus one tester on Hobby while investigating; broader named-user access requires a separately approved plan/access design. No claim of successful live OAuth is made.

## Family invitation and revocation

After acceptance passes, privately give each approved family member the single shareable link and tell them which verified account to use. Do not send invitations from this agent without explicit messaging authorization. The link is transferable; never describe it as a unique invitation. Family members should bookmark only the canonical site after access is established, according to observed host behavior.

To remove a member: remove their exact address from Preview secrets, redeploy the reviewed staging revision, verify their existing cookie is denied on pages/auth/data APIs, and revoke old deployment/link access. Preserve history/My List records. Revoke account sessions via a separately approved owner/admin workflow if needed; membership denial already blocks subsequent protected requests. To revoke the shared link, Vercel documents switching Share from Anyone with the link to Only people with access; remove individual grants separately. Test previously issued outer cookies after revocation rather than assuming immediate invalidation. If the link leaked, revoke it before replacing it with the one permitted link. Old deployments must not remain reachable with stale lists.

## Security and acceptance checklist

- Fresh browser, no share link: Vercel gate blocks every URL/alias, API and asset. No unrestricted public registration.
- Shared-link holder without BryxTV identity: login/register shell works; catalog/history/My List/playback API and media remain denied. Invalid/forged/expired cookies do not grant access.
- Verified allowlisted Google user: new-user callback creates only the intended staging account; returning login, avatar, navigation and refresh work. Unverified or unlisted Google email fails before account creation.
- Listed verified password account: login works; unlisted/unverified accounts and ALL direct password registration requests fail. Unauthorized user errors do not reveal membership.
- Removed user: old cookies fail on pages, get-session, account endpoints, watchlist/history mutations. Sign-out remains available. Distinct users cannot read/write each other's records.
- Correct HTTPS Secure/HttpOnly/SameSite cookie behavior, CSRF, trusted origin and safe internal returnTo. No wildcard CORS. No callback codes/tokens or shareable URLs logged by application, analytics, screenshots or platform log exports; review hosting logging/retention settings.
- Auth rate limits remain unchanged. Better Auth defaults to process-local memory limits: not a distributed abuse guarantee on serverless. Keep outer protection and review edge/shared limits before any public launch.
- CSP and iframe sandbox/allowlists remain unchanged. YouTube registry, URL filtering, trailer blocking, source resolver and eligibility tests remain enforced. No providers added or approved. Existing development source preview stays restricted to development/local host; deployed production mode disables it.
- Noindex headers are supplementary, never access control. No migration/seed command is part of deployment startup. No credentials or family list in browser bundles.

## Mobile and playback matrix

All **deployed** checks remain pending: iPhone Safari, iPad Safari, Android Chrome, desktop Chrome and desktop Safari. Test portrait/landscape or narrow/wide desktop. Record OS/browser and pass/fail/blocked separately; emulation is not a physical-device test.

Verify shared-link entry and cookie persistence, refresh, OAuth/callback, navigation/search, anime/K-drama details/episodes, My List persistence, owner-scoped history/Continue Watching, logout/session expiry/revocation. Check touch controls, keyboard accessibility, safe areas and overflow. Use only authorized local MP4/HLS demos for start/pause/resume/seek/fullscreen/exit/error recovery and saved progress. Ten-second demos do not establish playable commercial anime. Unsupported embeds must not fabricate progress.

## Rollback and troubleshooting

Rollback only to a protected Preview revision that includes the family authorization policy, with the CURRENT family list and correct staging DB/secret. Never roll back to pre-6.4 code behind a transferable link. Rebuild an old good revision with current secrets if necessary. Recheck all aliases; revoke outdated links/deployments through approved actions. No database rollback or reset is needed for this phase.

Missing/invalid allowlist: startup fails closed; correct Preview secrets and redeploy. Access denied: verify exact normalized address and verified identity privately, without publishing the list. Unverified pre-existing account: use a reviewed identity-verification workflow; do not weaken account linking. OAuth redirect mismatch: check exact stable HTTPS hostname and callback path. Share link/cookie failure: use the compatibility procedure above and stop before weakening protection. Rate-limit 429: wait the normal window and run signup-heavy tests sequentially; do not relax limits.

## Approval status

Gate A only: code, tests and this configuration plan are reviewable. Gate B (commit/push), C (Neon resources/migrations), D (Vercel/Google settings and share-link access), and E (first deployment) are separate, unapproved actions. Required inputs before execution: family identities through private environment entry, confirmed empty staging database workflow, stable protected hostname and staging OAuth client. No real family addresses or secrets are required in chat.

## Gate A verification record — completed 2026-11-11

- ESLint, TypeScript, Prisma validation and the production build passed. Build used a placeholder family identity and empty database/provider secrets; no YouTube credentials needed.
- Core/fixture suite: **86 passed, 0 failed, 6 opt-in live tests skipped**. UI suite: **21 passed, 0 failed**. This includes a real Better Auth handler with its in-memory adapter for allowed/denied password login, blocked registration, provider validation hook, session expiry, revoked-session API denial and sign-out. Google claims were synthetic; no live OAuth exchange was performed.
- Existing owner-isolation/history/watchlist/playback regression tests passed offline. The previous Phase 6.3 live database suite is historical evidence, not a newly executed Phase 6.4 result. No disposable live DB users were created for Phase 6.4.
- Both current Neon URLs were checked read-only and identified development br-raspy-sun-az80iq7r. Dedicated staging identity and migration readiness remain unverified; no migration or record modification performed.
- Local production HTTP checks passed: login/register/access-denied render, registration has no password form, noindex present; guest catalog/history/My List/demo/media requests redirect to login; watchlist/progress/source APIs return 403; direct password signup returns 403 before creating an account.
- Missing allowlist: instrumentation reports configuration failure and HTTP requests return 500 instead of serving the app. Next's process can remain listening despite the failed initialization, so deployment health checks must treat this as failure; it is not a successful startup.
- No live Vercel/share-link or Google OAuth tests, physical Safari tests, or new playback browser tests were claimed. These remain the external acceptance checklist. Local test servers were stopped.

Files added for Phase 6.4: `src/lib/auth/family-policy.ts`, `src/instrumentation.ts`, `src/proxy.ts`, `src/app/access-denied/page.tsx`, `src/features/auth/components/family-sign-out.tsx`, `tests/family-auth.test.ts`.

Files updated for Phase 6.4: `.env.example`, `.env.staging.example`, `next.config.ts`, `scripts/staging-environment.ts`, `src/lib/auth/{options,server,session,errors,google}.ts`, `src/app/{login,register}/page.tsx`, `src/features/auth/components/google-sign-in-button.tsx`, `tests/auth.test.ts`, `tests/staging-environment.test.ts`, `tests/ui/google-sign-in.test.tsx`, and this guide. All earlier uncommitted changes, including `tests/ui/history.test.tsx`, remain intact. No dependencies or Prisma migrations added.
