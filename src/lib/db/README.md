# PostgreSQL and Prisma (Phase 5.1)

Prisma CLI, Client, and PostgreSQL adapter are pinned to **7.10.1**. Prisma 8 is a
release candidate with different APIs; do not upgrade this project with an
unqualified `prisma@latest` install. See the [official release status](https://www.prisma.io/docs/orm/release-status).
The project uses Next.js 16.4.2, TypeScript 5.9.3, ESM, and npm. Use Node.js 22
as configured by `.nvmrc` and GitHub CI. Prisma's supported Node.js minimum is
20.19; one CLI dependency requests Node.js 22, so Node.js 22 is recommended for
clean installs.

## Configuration

- `prisma/schema.prisma`: PostgreSQL provider and the `prisma-client` generator.
  Its ESM TypeScript output goes to `src/generated/prisma/`, which is Git-ignored.
- `prisma.config.ts`: loads environment files with Next's `@next/env` helper,
  including `.env.local`, then selects **DIRECT_URL** for database CLI operations.
  It does not fall back to the pooled application URL. Offline validation and
  generation do not require a datasource URL.
- `src/lib/db/prisma.ts`: server-only `getPrisma()` factory, using **DATABASE_URL**
  and `PrismaPg`. It initializes lazily, caches one client per production process,
  and uses a global cache to survive development hot reload. Pool size is capped
  at five, with a ten-second connection timeout and thirty-second idle timeout.
- `scripts/check-db.ts`: checks both Neon connections with `pg`, using read-only
  transactions containing `SELECT 1`. It verifies that the CLI config selects
  `DIRECT_URL`, enforces Neon PostgreSQL URLs and required TLS modes, closes each
  connection, and reports no credentials or raw driver errors.

Next loads the application environment itself. Do not import the CLI config or
an env-file loader into Client Components. The `server-only` import prevents the
Prisma factory from being used in the browser. No database endpoint is exposed.

Example for future **server-side** code, when database queries are required:

```ts
import { getPrisma } from "@/lib/db/prisma";

const prisma = getPrisma();
// Use generated model APIs only from server-side code.
```

Do not disconnect this shared client after each request. The standalone
connectivity script uses separate short-lived `pg` clients instead.

## Local commands

Keep `DATABASE_URL` (pooled) and `DIRECT_URL` (direct) in the ignored `.env.local`.
The public `.env.example` contains blank placeholders only. Never put these
variables behind a `NEXT_PUBLIC_` prefix or paste them into logs.

```sh
npm ci                 # Includes postinstall Prisma Client generation
npm run db:validate    # Validate the model-free schema
npm run db:generate    # Regenerate after schema changes
npm run db:check       # Explicit read-only live Neon check
npm run lint
npm run typecheck
npm test
npm run build
```

`db:check` loads the actual Prisma config and tests the pooled application and
direct CLI destinations separately. It does not test migrations. Prisma Client
initialization and singleton reuse have also been verified without making a
query through Prisma.

The supplied Neon URLs use TLS. `pg` currently treats `sslmode=require` as
`verify-full` and emits a warning about future major-version semantics. Explicit
`sslmode=verify-full` preserves certificate/hostname verification if the driver
is upgraded later. Existing `.env.local` values were not modified, and certificate
verification was not disabled.

## Schema and CI

Phase 5.1 introduced no placeholder models or tables. Phase 5.2 adds the four
Better Auth models through the reviewed `20261022144500_init_better_auth` migration.
See [authentication setup](../auth/README.md) for generation, migration review, and
session details. No reset, drop, database recreation, or `db push` was used.
An empty schema is not a migration plan for an existing database: add and review
the intended models before running any schema-changing command.

GitHub CI runs schema validation after `npm ci`. Install-time client generation,
schema validation, type checking, and builds do not require a live database or
repository database secrets. Offline validation and generation were also verified
in an isolated directory without `.env.local`. Do not add `db:check` to public PR
checks or expose production credentials to them.

Both pooled and direct Neon connections passed read-only `SELECT 1` on
October 22, 2026. Authentication was added in Phase 5.2.
