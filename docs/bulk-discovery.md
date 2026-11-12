> Phase 6.2.3: YouTube playback and external viewing links are excluded. YouTube discovery is inactive; do not configure API credentials or run live discovery. Historical code, fixtures and reports are retained. See `docs/youtube-exclusion.md`.

# Phase 6.2.1 — Free bulk discovery

Implemented 2026-11-02. The permanent operating-cost constraint is **zero content licensing fees and zero paid streaming-provider fees**; only basic website hosting is planned. The earlier licensed-provider audit remains historical research, not a paid-services roadmap. No subscriptions, paid APIs, hosting for video, unauthorized providers, media extraction or media downloads were added.

## What is implemented

- Server-only YouTube Data API v3 client with pinned publisher IDs, mandatory channel-handle cross-checks, channel playlists, uploads fallback, playlist ownership checks, pagination and 50-video metadata batches. Existing `playback:discover` remains available for its original single-video workflow.
- Request budget, repeated-page-token protection, bounded pages, timeouts, safe quota/rate errors and a circuit breaker after quota/rate exhaustion. No retry storm and no quota expansion purchases. A request counter measures uncached requests; API keys travel in a header and are excluded from URLs/cache keys/logs.
- Private 24-hour metadata cache, candidate queue, atomic file writes, idempotent merge by video ID, preserved rejections and independent review evidence. Fixture and live workspaces are separate; neither is imported by public routes.
- Classification: FULL_EPISODE, FULL_MOVIE, SEASON_COMPILATION, TRAILER, CLIP, SHORT, UNKNOWN. A title/description's explicit episode/movie claim plus supporting duration is a candidate heuristic, not a completed playback/content verification. Explicit trailers/clips/shorts and restricted/nonpublic/paid-title candidates are excluded from free episode review.
- Exact normalized titles/aliases, explicit seasons/episodes, episode names and release-year checks for movie confidence. Ambiguous absolute anime numbering remains unmapped. HIGH/MEDIUM/LOW confidence never grants playback approval.
- Read-only TMDB enrichment for the initial known popular-series targets, including alternative titles and explicitly mentioned seasons. `--catalog` accepts additional normalized TMDB metadata, including movies. This is deliberately not a fuzzy matcher that invents identities for unknown titles.
- Duplicate video IDs, repeated playlist listings and conflicting source-to-episode assignments are detected. Duplicate listings do not become extra episodes. Existing reviewed assignments block conflicting drafts.
- Per-video review/rejection, explicit manual mapping against supplied episode metadata, independent verification records, and review-draft export into the existing approval workflow. Changed metadata invalidates prepared verification through a metadata fingerprint. No bulk auto-approval command exists.
- JSON/CSV reports with classifications, mapping confidence, duration, subtitles, region/embed status, approval state, rejection/uncertainty reasons, browser/seek/fullscreen checks, timestamp, aggregate counts and candidate season opportunities. CSV formula-leading values are escaped.
- Watchable rows rank **approved** series by complete-season coverage, consecutive episodes, verified episode count, reviewed PH/English metadata and popularity. Reliable publisher identity remains an eligibility gate. Candidate opportunities cannot affect public rows. Existing source policy, player, CSP, sandbox, auth, watchlist and progress handling are preserved.

## Publisher configuration

`src/features/playback/discovery/publishers.ts` currently pins:

| Publisher | Category | Channel ID |
| --- | --- | --- |
| Muse Asia | anime | UCGbshtvS9t-8CW11W7TooQg |
| Muse Philippines | anime | UC6sKhWSlPSWIh6e4ukisDHQ |
| Ani-One Asia | anime | UC0wNSTMWIL3qaorLx0jie6A |
| Ani-One Philippines | anime | UCZGEjiTMwMv-Mf-t3VLBlJQ |
| KBS WORLD TV | kdrama | UC5BMQOsAB8hKUyHu9KI6yig |

Corporate identity references remain in `officialProviders`; the API must independently return the expected official handle for each pinned ID. The new bulk integration has not verified these identities through a real API request in this run because the key is absent. Per-video uploader checks and manual verification still apply, even inside an official playlist. Additional broadcasters require reviewed IDs/handles and policy entries, not arbitrary command-line channel URLs. Ani-One's paid ULTRA material is not a free-content grant.

Sources: [Muse official directory](https://www.e-muse.com.tw/cn/social-media/), [Medialink's Ani-One ownership and membership description](https://www.medialink.com.hk/en/Anione.aspx), [KBS WORLD](https://kbsworld.kbs.co.kr/about/kbskorea.php). No new non-YouTube provider met this task's verified free-content requirements; no guessed iframe hosts were added.

## API setup

1. Use the existing Google Cloud project or create a project; enable **YouTube Data API v3**.
2. Create an API key restricted to that API and appropriate server usage. Put `YOUTUBE_API_KEY=...` in ignored `.env.local`, never a `NEXT_PUBLIC_` variable. Google OAuth client credentials are not this API key.
3. Use the standard free quota; the commands do not require a paid plan. Inspect remaining quota in Google Cloud. Default request budget is 100; `--request-budget` accepts 1–500. Quota/rate exhaustion produces partial reports and a nonzero exit code, never automatic approval.
4. Keep the existing TMDB server token for metadata enrichment. Without it, discovery can still report unmapped candidates; provide a reviewed `--catalog` JSON or restore metadata access before mapping.

Official references: [setup](https://developers.google.com/youtube/data/getting-started), [channels.list](https://developers.google.com/youtube/data/reference/rest/v3/channels/list), [playlists.list](https://developers.google.com/youtube/v3/docs/playlists/list), [playlistItems.list](https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list), [videos.list](https://developers.google.com/youtube/data/reference/rest/v3/videos/list), [quota costs](https://developers.google.com/youtube/data/determine_quota_cost), [developer policies](https://developers.google.com/youtube/terms/developer-policies).

The API's channel/playlist/video list requests used here each cost one unit according to current documentation. Local caching reduces repeated calls. Keep exported API-derived reports refreshed or remove them in accordance with YouTube's retention policies; the 24-hour response-cache prune is not a scheduled cleanup of manually retained reports. No YouTube account OAuth or viewer credentials are collected.

## Commands

Use Node 22.12+ or a supported newer runtime and npm.

```sh
npm run content:discover -- --type anime --limit 100
npm run content:discover -- --type kdrama --limit 100
npm run content:discover -- --type all --limit 100 --dry-run
npm run content:discover -- --type anime --series "One-Punch Man" --publisher muse-philippines --limit 100
npm run content:discover -- --type anime --publisher muse-philippines --playlist PLAYLIST_ID --limit 100
npm run content:discover -- --type all --limit 100 --catalog reports/discovery/reviewed-catalog.json --out reports/discovery/custom
```

`--playlist` requires a pinned `--publisher`; its owner is checked through the API. `--series` filters publisher playlists and candidate titles using normalized literal names; choose the publisher's exact series/alternate title or an explicit playlist for other-language playlist titles. The global `--limit` (1–1000) bounds playlist video identifiers examined, including repeated listings, not promised approvals. Publisher queues are scanned round-robin. Limits may stop before all playlists/seasons are scanned; `complete` means no API/enrichment errors within that bounded run, not that the whole channel was exhausted.

`--dry-run` writes the requested JSON/CSV reports but does not change candidate staging or the response cache. Report output is a non-public directory inside the repository; fixed filenames are `discovery.json` and `discovery.csv`. Failed enrichment, missing/private videos or quota failures remain visible in `errors`, and partial reports have a nonzero exit code.

For **explicitly synthetic** runs without an API key:

```sh
npm run content:discover -- --type anime --limit 100 --fixture
npm run content:discover -- --type kdrama --limit 100 --fixture
npm run content:discover -- --type all --limit 100 --fixture --dry-run
npm run content:review -- --fixture
```

The fixture transport cannot fall through to a network fetch. A missing real key fails with setup instructions; the program never silently substitutes fixtures for live results. Fixtures cannot be exported into playback reviews or approved.

## Matching and review workflow

1. Inspect `npm run content:review -- --video VIDEO_ID` and the JSON report. Public playback cannot read the candidate store. UNKNOWN candidates remain disabled.
2. For ambiguous numbering, create a per-video mapping review JSON containing `videoId`, a normalized `catalog` entry matching `mappingSchema`, explicit `season` and `episode` (null for movies), `mappingConfirmed: true`, an independent `reason` of at least 40 characters, and ISO `reviewedAt`. Run:

   ```sh
   npm run content:review -- --video VIDEO_ID --mapping reports/discovery/mapping-review.json
   ```

   The chosen episode must exist in the supplied TMDB season metadata. The review is retained across unchanged rediscovery, but changed provider metadata requires reassessment. Duplicate assignments are refused. No mapping creates a playable source.
3. Reject unsuitable content explicitly:

   ```sh
   npm run content:review -- --video VIDEO_ID --reject "Independent review found an incomplete episode upload."
   ```

   Rejection is retained on rerun. Original database records are untouched. Embed-disabled candidates can instead be independently reviewed for a free official external link; they cannot become internal playback sources.
4. For an eligible mapped candidate, export a draft:

   ```sh
   npm run content:review -- --video VIDEO_ID --export-review reports/reviews/episode-unknown.json
   ```

   This is an UNKNOWN review draft with unverified region/access/embed/subtitles. Independently confirm uploader/distribution rights, exact mapping and full content before registering the draft via existing `playback:manage official-add`; correct any unconfirmed fields explicitly. Then use existing `playback:manage add` with a separately reviewed source JSON. That creates only a disabled UNKNOWN development source. These existing tools verify **both actual Neon development connections** before operations.
5. Test the source with the existing authenticated localhost development preview. Independently record full-episode/movie evidence, exact publisher, allowed embedding, title-specific PH availability, public/free access, actual subtitles, moving playback, native seeking and desktop fullscreen. `embeddable=true`, a caption flag, a PH locale label or successful metadata request is not sufficient evidence.
6. Record a separate JSON verification file **for each video** using `verificationProofSchema` in `discovery/review.ts`:

   - Exact `videoId`, `tmdbId`, `mediaType`, `season`, `episode`.
   - Explicit `publisherConfirmed`, `mappingConfirmed`, `fullContentConfirmed` set true only after review.
   - At least 40 characters each for `publisherIdentity`, `fullContent`, `embedPermission`, `philippines`; at least 20 for `subtitles` (unknown languages must be stated honestly).
   - `browserPlayback`, `seeking`, `fullscreen`: PASS / FAIL / NOT_TESTED.
   - `region`: UNKNOWN / AVAILABLE_PH / RESTRICTED_PH; `embedding`: UNKNOWN / ALLOWED / BLOCKED; `access`: UNKNOWN / PUBLIC / MEMBERSHIP / PAID.
   - `subtitleLanguages`: actually verified ISO language codes only, otherwise `[]`; ISO `verifiedAt`.

   ```sh
   npm run content:review -- --video VIDEO_ID --verification reports/discovery/episode-verification.json
   npm run content:review -- --video VIDEO_ID --prepare-approval --export-review reports/reviews/episode-reviewed.json
   ```

   Internal approval preparation requires all playback checks PASS, PUBLIC access, AVAILABLE_PH and ALLOWED embedding. It checks per-video evidence identity and current metadata fingerprint. It still only exports a draft, never enables a database source. For a reviewed free provider page whose embed is blocked, use `--prepare-provider-link` instead; this requires verified public PH access and provider-page playback. It prepares WATCH_ON_PROVIDER, not an internal Play action.
7. Use the **existing** explicit per-source operations for approval:

   ```sh
   npm run playback:manage -- official-add reports/reviews/episode-reviewed.json --reviewed
   npm run playback:manage -- verify SOURCE_ID AVAILABLE "Independent actual playback verification evidence for this exact source." --played
   npm run playback:manage -- official-audit
   ```

   A provider-only review needs only the reviewed official manifest entry, not a playable database source. Neither the new pipeline nor these examples batch-approve sources. There is no `--approve-all` option. An operator must supply real independent evidence for every source. Disable broken sources using existing tooling rather than deleting them; user history remains intact.

Compilations stay separate from episode mappings and go through the existing manual compilation review. Unknown/unavailable episodes retain existing availability messages and no internal Play button. Verified provider-only entries use the existing safe external links.

## Results from this implementation run

`YOUTUBE_API_KEY` is absent. **No live discovery was performed and no real titles/episodes were newly discovered or approved through the pipeline.** Existing sources were not reclassified.

| Result | Anime fixture | K-drama fixture | Combined fixture |
| --- | ---: | ---: | ---: |
| Video identifiers examined | 20 | 8 | 28 |
| Unique synthetic candidates | 10 | 4 | 14 |
| Candidate full episodes (not approvals) | 5 | 3 | 8 |
| HIGH-confidence synthetic mappings | 4 | 3 | 7 |
| Duplicate playlist occurrences | 10 | 4 | 14 |
| UNKNOWN approval state | 10 | 4 | 14 |
| Pending manual review | 7 | 3 | 10 |
| Rejected/excluded | 3 | 1 | 4 |
| Newly verified playable / approved | 0 | 0 | 0 |
| Newly verified provider-only | 0 | 0 | 0 |

Synthetic titles: **Fixture Anime** and **Fixture Drama**. Their candidate opportunity reports show four and three consecutive mapped episodes respectively, with candidate-complete seasons; **verified coverage is zero for both**. The extra anime episode with absolute numbering is deliberately unresolved. Repeating anime discovery retained exactly 14 unique staged IDs across both types, all disabled UNKNOWN; no duplicate rows were created. Simulated/cache request counts are not billable/live API calls.

Reports generated:

- `reports/discovery/fixtures/anime/discovery.json` and `.csv`
- `reports/discovery/fixtures/kdrama/discovery.json` and `.csv`
- `reports/discovery/fixtures/all/discovery.json` and `.csv`

Local state: `.bryxtv/discovery/fixtures/candidates.json`; real runs use `.bryxtv/discovery/live/candidates.json`. Generated caches, review queues and reports are Git-ignored, outside `public/`, and not imported by web code. They can be regenerated with the commands above. Candidate counts, repeated listings, pending/rejected decisions and actual approval counts are distinct metrics. Discovery reports conservatively report no new approved or provider-only playback; `playback:manage official-audit` remains authoritative for later manual source approvals.

## Database safety and existing catalog

Both DATABASE_URL and DIRECT_URL independently verified the actual Neon branch `br-raspy-sun-az80iq7r` before database operations. A read-only source inventory showed six existing source rows, including the three approved anime episodes, two disabled UNKNOWN YouTube sources and disabled UNKNOWN Valkaama. Their records/approval states are preserved. The provider-only Healer compilation remains a manifest entry, not twelve invented episode sources.

No discovery/queue data is inserted into PostgreSQL. No schema changes or migrations. Existing live integration tests create and remove only their own disposable fixtures; no existing user records were reset. No production operations, commits, pushes or branch changes. The historical licensed-provider audit and the uncommitted history test fix are retained.

## Modified files and validation

- New `src/features/playback/discovery/`: `types.ts`, `publishers.ts`, `youtube.ts`, `classification.ts`, `matching.ts`, `catalog.ts`, `pipeline.ts`, `ranking.ts`, `storage.ts`, `review.ts`.
- New CLI scripts: `scripts/content-discover.ts`, `scripts/content-review.ts`, `scripts/discovery-fixture.ts`.
- Updated `src/features/playback/providers/watchable-catalog.ts` for approved-only ranking.
- New `tests/discovery.test.ts`, `tests/discovery.integration.test.ts`, `tests/fixtures/discovery/sample.json`.
- `package.json`, `.gitignore`, `.env.example`, README and this guide. No new dependencies.
- `tests/ui/history.test.tsx`: pre-existing import-order fix reviewed, preserved, and included in validation; not overwritten.

Final verification on Node 22.12.0:

- ESLint: passed without warnings.
- TypeScript: passed.
- Prisma schema validation: passed; no migration created or applied.
- Offline suite: **76 core/fixture-integration tests + 17 UI tests = 93 passed**; six opt-in live tests correctly reported skipped in this run. Both preserved history UI cases pass.
- Separate opt-in development integration run: **10 tests passed**, including authentication/subtests, ownership/persistence/history, stale progress updates, playback approval/resolution, provider-only links, episode navigation and approved-only Watchable filtering. These were actually run, not counted from skipped tests.
- Production build: passed with database/auth/TMDB environment values blanked, without requiring live API calls.
- Fixture CLI demonstrations generated all six JSON/CSV files; an explicit dry-run preserved staging; a repeated staged run retained 14 unique disabled UNKNOWN IDs. Integration tests use their own private `--state-dir` so concurrent demo runs cannot change their before/after checks. Fixtures and incomplete or conflicting verification cannot export an approval; unsupported approve-all is rejected.
- Browser smoke check: Watchable Anime contains One-Punch Man before Attack on Titan (two consecutive approved episodes versus one). No Fixture Anime/Drama titles enter the website; empty Watchable K-Drama remains hidden. Desktop layout has no horizontal overflow. Existing live endpoint regressions verify the original watch pages and provider-only links. No new actual video playback/fullscreen verification was claimed.
- Read-only final database check: both development connections verified; all six pre-existing playback records retain their original states, with exactly three approved episodes.
- `git diff --check`: passed. Branch remains `staging`; no commits or pushes. The temporary server was stopped after testing; the verification tab was left unmarked for automatic cleanup.

UI proof: `/tmp/bryxtv-bulk-catalog.png`.

## Remaining limitations and next phase

- The real YouTube transport cannot be live-tested until the free API key is supplied. Fixture tests do not establish regional availability, uploader approval, free access, subtitles, seeking or fullscreen for real videos.
- Automatic matching starts with known popular TV targets; other titles/movies require an additional reviewed normalized catalog file or explicit mapping review. Fuzzy/ambiguous anime mappings intentionally remain unapproved.
- Classification is conservative and can miss complete episodes that lack explicit labels or have very short runtimes. Review those manually; do not weaken completeness checks just to increase counts.
- Run local discovery/review commands sequentially against a workspace. Both tools accept `--state-dir .bryxtv/discovery/WORKSPACE` for separate private queues/caches; paths outside that private tree are refused. Atomic file replacement prevents torn JSON; there is no multi-operator job coordinator or automatic background scheduling.
- Public playlist/region/embed metadata can change. API availability signals do not replace actual PH playback, rights and subtitle checks. Existing approved sources are not automatically revoked by discovery.
- No new non-YouTube free source was verified, no actual new media was played, and no physical mobile/fullscreen claims are made in this phase. Existing player behavior is regression-tested without modifying its controls.

**Recommended next phase:** configure the free YouTube Data API key, run the two real 100-candidate commands, then independently verify a consecutive official season/range starting at episode 1. Use only zero-fee permitted playback; do not pursue paid licensing or paid player plans. Stop after this implementation for review.
