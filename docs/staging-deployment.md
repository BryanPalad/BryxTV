# Phase 6.3 — Private staging preparation

Preparation only. No deployment, cloud resource creation, commit/push automation or migrations are enabled by this configuration.

Use a separate Vercel Preview project from the staging branch with deployment-level protection enabled before the first deployment. Never promote to Production or provide production credentials. Hobby is limited to personal/noncommercial use and one externally granted named tester; wider family authorization requires a separate implementation and review. See [Vercel Authentication](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication).

## Environment and database

Use `.env.staging.example` as a reference; Next does not load `.env.staging` automatically. Keep NODE_ENV=production and BRYXTV_ENV=staging. Configure identical stable HTTPS NEXT_PUBLIC_APP_URL and BETTER_AUTH_URL, a new BETTER_AUTH_SECRET, pooled DATABASE_URL, direct DIRECT_URL, independently confirmed non-production STAGING_NEON_BRANCH_ID, staging GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET and server-only TMDB_READ_ACCESS_TOKEN. No YouTube keys required.

`npm run staging:check` validates explicitly injected values and both Neon branch identities with read-only queries. It does not load .env.local, prove secret uniqueness or establish whether the caller-supplied branch ID is non-production. Independently verify the branch first. Prefer a dedicated staging database; do not copy production data. Resource creation and migrations require separate approval. Never run migrations during build/startup.

## Build and authentication

Use Node 22.12+ within Node 22 or supported Node 24, npm ci (Prisma generation via postinstall), npm run db:validate, npm run lint, npm run typecheck, npm test, npm run build. Node SSR/API routes are required; static export is unsuitable. Local/self-hosted startup is npm run start behind a protected TLS gateway.

Google's Web OAuth client needs exact origin https://<stable-preview-host> and redirect https://<stable-preview-host>/api/auth/callback/google. Use distinct staging secrets/client and preserve exact trusted origins, secure cookies and CSRF. Do not bypass protection for callbacks. Complete browser verification before sharing any URL.

## Access and acceptance

Deployment protection must cover all aliases, pages, APIs and assets. Anonymous requests must be denied before Next. Staging noindex headers are supplementary, not authorization. No application-level family allowlist is included in this phase; do not expose unrestricted registration publicly or distribute bearer bypass links.

Test authorized MP4/HLS demos, seeking/fullscreen, My List, owner-scoped viewing history, Continue Watching, logout and expired sessions. Test iPhone/iPad Safari, Android Chrome and desktop Chrome/Safari in portrait/landscape or narrow/wide layouts. Emulation is not physical-device testing. Live OAuth and protection checks require an approved deployment.

Rollback only to a known-good protected Preview revision with the correct non-production environment. Preserve database records and verify every alias after rollback. No automatic production deployments, paid actions or changes to Neon are authorized by this guide.
