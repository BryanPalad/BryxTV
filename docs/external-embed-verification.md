# Phase 6.0.1 — Valkaama external embed verification

Reviewed 2026-10-23. Integration and partial browser verification are complete. **Source
remains disabled and UNKNOWN** because reliable fullscreen sizing and complete playback
verification could not be established in the automated in-app browser. No AVAILABLE
operator assertion was issued. This document distinguishes playback observations from
full approval.

## 1. Selected movie and provider

Valkaama (2010), directed by Tim Baumann; Internet Archive's public embedded player.
The creator describes a full feature drama, not a trailer or an excerpt.

## 2. Duration

The actual embedded player displayed **1:33:06** for its Valkaama 1080p version.
The Archive item also lists a 720p version of 1:33:06 and a DVD PAL version of 1:33:13.
Only the 1080p player's duration was observed during BryxTV playback. The entire film
was not watched end to end; duration is the player's reported media duration.

## 3. Exact embed URL

https://archive.org/embed/valkaama

This URL was copied from the item's actual Share → Embed dialog, rather than inferred
from a URL convention. Item: https://archive.org/details/valkaama
No media file was downloaded, proxied, uploaded, or stored by BryxTV.

## 4. Rights and embedding evidence

- Creator film page: https://www.valkaama.com/index.php?l=en&page=movie — identifies the
  film, director, matching story and original Movie License: Attribution–ShareAlike 3.0.
- Original license: https://creativecommons.org/licenses/by-sa/3.0/ — permits sharing,
  including commercially, subject to attribution/license and applicable conditions.
- Creator release notes: https://www.valkaama.com/rss.php?l=en — full film release in
  2010 and subsequent HD release. No FTP source was accessed.
- Internet Archive's own embed guidance:
  https://archivesupport.zendesk.com/hc/en-us/articles/360018377531-Movies-and-Videos-Tips-Troubleshooting
- The exact item's Share → Embed dialog supplies the URL above with fullscreen support.

The Archive item's metadata labels BY-SA 4.0, while the creator's original film license
is BY-SA 3.0. This implementation cites the creator's original 3.0 license and does not
assert that an Archive uploader can relicense the work. Title, creator, date and story
match. Attribution links remain next to the embedded movie; the film is embedded unchanged.
No conclusion here assumes that all Archive uploads are public domain.

## 5. TMDB match

TMDB movie **74890**, Valkaama (2010). Existing authenticated TMDB search returned this
record with the same title and distinctive Lasse/Ari/Runa story as the creator and Archive
item. Existing metadata fetching is unchanged; no fabricated TMDB identity was introduced.

## 6. Development records

Both PostgreSQL URLs independently reported development branch **br-raspy-sun-az80iq7r**
before registration writes. Post-registration read-only verification reconfirmed both.
The existing development-only CLI created:

- Provider ID `cmvl2hnpl0000d0sbpg7k1fen`, slug `internet-archive`, enabled, EXTERNAL_EMBED.
- Source ID `cmvl2hp6x0000edsb4r2a9mqi`, target `movie:74890`, priority 10.
- Source `authorizationVerified=true`, `enabled=false`, `availabilityStatus=UNKNOWN`,
  `lastCheckedAt=null`. Rights evidence is private database metadata.

Provider capability: fullscreen allowed, progress unsupported, manual availability check.
No schema changes or migrations. Existing records were not reset or removed. Temporary
regression fixtures and the newly created disposable browser account are cleaned up by
exact IDs; the registered film/provider remain for subsequent manual verification.

## 7. Actual playback observations

Browser automation clicked the real Play button inside BryxTV's existing watch route.
The poster changed to moving opening credits; a visible provider clock showed 00:27.
Using the provider's actual seek slider keyboard controls reached 46:43, then 46:48,
with a later dialogue scene rendered. This establishes real playback and later seeking,
not merely an iframe load or HTTP 200. Playback also started at mobile width (00:12
observed). Background browser throttling/reloads made sustained timing verification
inconsistent. No human has confirmed the complete checklist and no full-film watch was
performed. Availability therefore remains UNKNOWN.

## 8. Desktop, mobile and fullscreen

- Desktop: actual film rendered inside the existing watch page; registered provider selected.
- Mobile: 390 × 844 viewport, responsive header, source selector and 16:9 frame fit the page;
  actual playback started. This is viewport testing, not a physical iOS/Android device test.
- Fullscreen: the control entered a fullscreen presentation, but the test browser rendered
  the provider content undersized with excess blank/black space. A container fullscreen
  implementation and explicit fullscreen sizing were added; a repeat still showed the
  browser/provider sizing anomaly. Reliable fullscreen scaling/exit is **not verified**.
- No unexpected external navigation occurred during Play, seek or fullscreen actions.
- An unavailable movie without a public approved source still rendered its unavailable
  message and no iframe. Guest attempts to use the preview also rendered no iframe.

## 9. CSP, sandbox and progress safety

Only `https://archive.org` was added to the registry-derived frame origins. The Archive
validator accepts exactly the reviewed Valkaama embed URL, rejecting other items, query
parameters, credentials, HTTP, suffix hosts and alternate paths. Source registration still
requires rights approval and public resolution still requires actual playback approval.

Sandbox remains `allow-scripts allow-same-origin allow-presentation`; allow permissions
remain fullscreen, picture-in-picture, encrypted-media. No popup, top-navigation or form
permission was added. No provider script is injected in BryxTV. Browser logs showed no
CSP/frame-embedding rejection. Archive's own scripts emitted duplicate custom-element
warnings and a null `categories` TypeError; playback nevertheless started. These provider
errors were not hidden or worked around by weakening security.

The provider document sometimes did not finish loading while video was already playing.
Timeout text now describes that ambiguity instead of implying the video necessarily failed.

No timestamps are scraped by application code and no undocumented postMessage adapter was
added. Automation inspected visible controls only. The embed mounts no progress tracking;
a read-only query confirmed zero viewing-progress rows for the disposable preview account.
Existing Video.js progress, History and Continue Watching remain covered by regressions.

## 10. Automated verification

- ESLint and strict TypeScript: passed.
- Prisma schema validation: passed; direct `prisma migrate status`: all four migrations
  applied, schema up to date. Both connections passed read-only development identity checks.
- Core offline tests: 48 passed, four optional live suites skipped by offline invocation.
- UI tests: 11 passed, including unverified preview wording and fullscreen container targeting.
- Separate live development regression run: all four suites passed, eight tests including
  authentication subtests (auth/session/logout, history, providers/Continue Watching, My List).
- Production build: passed, including production TypeScript checking and all route generation;
  performed with external credentials blank.
- Guest preview/public API checks: source absent, zero iframe, unavailable message retained.

Google flow regressions use supported automated fixtures; no new real Google consent flow
was attempted. No production database credentials or records were changed.

## 11. Remaining limitations

Source is intentionally not publicly playable yet. Internet Archive availability, buffering,
provider JavaScript and fullscreen behavior are outside BryxTV's control. Browser automation
provided partial evidence but did not establish reliable fullscreen or sustained playback
across physical devices. Exact Resume Watching is unsupported for this external provider.
No new dependencies, paid services, uploads, commits or pushes were introduced.

## 12. Manual approval steps

1. Run the development server with the existing development environment; sign in normally.
2. Open `/watch/movie/74890?preview=cmvl2hp6x0000edsb4r2a9mqi` on localhost. The preview
   is restricted to authenticated sessions, loopback hosts and development mode. Public
   production routes/API cannot enable a preview through query parameters.
3. Select Internet Archive, click Play and watch continuously beyond one minute. Confirm
   the displayed 1:33:06 duration; seek to multiple later sections and verify continued motion/audio.
4. Test fullscreen scaling, controls and exit in desktop Chrome/Safari and on a physical
   mobile device. Inspect console for CSP/frame rejection; report provider errors separately.
5. Confirm no unexpected navigation, the selector label, responsive layout, and unavailable
   state for an unrelated unapproved title. No exact progress should be written for the embed.
6. Only after all checks succeed, record real reviewer/browser/date evidence using:

   `npm run playback:manage -- verify cmvl2hp6x0000edsb4r2a9mqi AVAILABLE "Actual reviewer, date, browser, duration, seek and fullscreen results" --played`

   This CLI re-verifies BOTH connections against the required development branch before
   writing. Do not execute the example with placeholder evidence. AVAILABLE enables the
   source; UNKNOWN/UNAVAILABLE keep it disabled. Then verify `/watch/movie/74890` without
   the preview parameter through the public resolver.

## Files changed in Phase 6.0.1

- `src/features/playback/providers/registry.ts`, `types.ts`, `policy.ts`
- New `src/features/playback/providers/development-preview.ts`
- `src/features/playback/components/watch-page.tsx`, `source-selector.tsx`, `embedded-player.tsx`
- `src/app/globals.css` (fullscreen container sizing only)
- `scripts/playback-sources.ts` (disabled until successful verification)
- `tests/playback-providers.test.ts`, `tests/ui/playback-sources.test.tsx`
- `docs/playback-providers.md`, this verification report

The repository already contained many uncommitted changes from previous phases; those were
preserved. No automatic commit or push was made.

### Phase 6.0.2 follow-up

See `embed-fullscreen.md` for measured fullscreen investigation and hardening. Desktop
wrapper and provider fullscreen entry/exit passed in the available browser. Mobile
inline layout passed; physical mobile/native fullscreen still requires testing because
viewport emulation and native screenshot sizing disagree. Source remains disabled/UNKNOWN.
