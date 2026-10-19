# BryxTV

Every Story. One Screen.

A local preview of a cinematic entertainment catalog built with Next.js App Router, strict TypeScript, Tailwind CSS, shadcn/ui, Lucide, and Motion. All titles and artwork are local fictional placeholders. No external API, authentication, database, or playback integration is active.

## Development

Use Node.js 20.9+ and npm (Node.js 22 LTS recommended).

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. No credentials are needed for the preview.

```sh
npm run lint
npm run typecheck
npm run build
npm start
```

## Structure

- `src/app`: routes, root layout, metadata, and global styles.
- `src/components/ui`: shadcn components; shared, feature-independent primitives.
- `src/components/layout`: shared header and footer.
- `src/features/catalog`: catalog components and local mock data.
- `src/types`: shared domain types.
- `src/constants`: navigation and brand configuration.
- `src/lib/utils.ts`: shared class-name helper.
- `src/lib/providers`: future server-side TMDB and AniList adapters.
- `src/lib/auth`: future Better Auth integration.
- `src/lib/db`: future Prisma/PostgreSQL integration.
- `public/artwork`: original local SVG placeholder illustrations.

Keep feature-specific code inside its feature; promote components to shared folders only when reused. Add provider adapters and database clients when those integrations are actually implemented. Secrets belong in ignored environment files; `.env.example` contains names only.

Category navigation filters the local catalog through the `category` query parameter. Cards open keyboard-accessible detail dialogs. Explore links scroll to the catalog; no playback or sign-in controls are active. Dark mode is the default, and animations respect reduced-motion preferences.

Development and production builds use Webpack with Tailwind’s PostCSS adapter to avoid a Turbopack CSS-worker port restriction in the initialization environment.
