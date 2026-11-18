# Phase 6.5 — Authorized free non-YouTube anime sources

Research date: 2026-11-17 (Asia/Manila). Local branch: `staging`.
Baseline: `35eeff1e735f38d3563a9be5faebbff23f6d0aa2`.

## Decision

**No new source qualifies for integration on the evidence reviewed.** This is an evidence limitation, not a claim that no qualifying source can exist. Phase 6.5 integration is pending an authorized test asset and delivery grant. No anime playback source, provider, endpoint, CSP origin or approval record was added.

Gate F remains NO-GO. Existing Preview protection must remain enabled. Production containment, deployed Neon branch identity and live Google OAuth remain unverified. This research does not resolve those blockers or authorize rollout.

## Acceptance criteria

A source must satisfy every item before local playback integration:

- Identifiable rights holder or authorized distributor, with evidence covering the specific anime, season, episodes and version.
- Explicit permission for third-party playback inside BryxTV in the Philippines, through either a supported provider embed or provider-supplied MP4/HLS for a custom player.
- Zero content licensing fees and zero provider subscription/player/delivery fees to BryxTV; no trial-only qualification, video-hosting purchase or file rehosting.
- Non-YouTube delivery throughout; no extracted manifests, copied consumer session tokens or circumvention of territorial restrictions.
- Exact episode mapping, rights window, permitted audience, audio/subtitle rights and attribution requirements.
- Documented delivery URLs and required resource origins, CORS, expiry, advertisement and security requirements compatible with the existing player and gates.

A working iframe, public media URL, free consumer account, hosting API or software license does not supply the missing content grant. Provider-only viewing is not integrated playback.

## Current research evidence

These findings use the public primary sources below. Search/retrieval is not a Philippines playback test, a complete catalog audit or a private contract review.

| Candidate | Evidence reviewed | Decision for BryxTV |
| --- | --- | --- |
| Muse Communication | Official [film/TV inquiry](https://www.e-muse.com/en/media-contact/) offers OTT and Internet licensing categories; [licensing business](https://www.e-muse.com/en/licensing-business/) describes distribution services. | Rights-holder/distributor lead only. No zero-fee grant, exact episode package or non-YouTube delivery specification established. No contact submitted. |
| Medialink / Ani-One | Official [content distribution page](https://www.medialink.com.hk/en/Content.aspx) and [contact page](https://www.medialink.com.hk/en/Contact.aspx) provide a business route. | No BryxTV title/territory grant, zero-fee terms or usable delivery specification established. Brand licensing and corporate announcements do not prove episode streaming rights. No contact submitted. |
| Anime-Planet | Its own [project description](https://www.patreon.com/animeplanet/about) explains that legal viewing is limited to announced industry partnerships. | Its partnerships do not establish permission for BryxTV to reuse those players or feeds. No transferable grant or Philippines package verified. |
| RetroCrush | Official [FAQ](https://explore.retrocrush.tv/frequently-asked-questions-faqs/) and [service overview](https://explore.retrocrush.tv/) describe consumer viewing. | Consumer offering only for this review. No third-party playback authorization, permanent zero-fee BryxTV delivery or Philippines episode entitlement established. Do not substitute a trial for free delivery. |
| Tubi | Official [terms page](https://tubitv.com/static/terms) yielded only a heading; the attempted official country-help page was inaccessible. | Insufficient retrievable evidence. Do not infer permission or territory support from free-viewing marketing. No integration. |
| Bilibili international | Official [international terms](https://www.biliintl.com/marketing/protocal/international_en.html) did not expose substantive terms through the research tool. | Third-party grant and Philippines/free episode availability remain unverified. Mainland embed mechanisms cannot establish international licensed-series permission. |

Previous broader research remains in `docs/non-youtube-provider-feasibility.md`; this focused update does not reverify all of its providers or import its historical implementation status. Current YouTube exclusion is documented in `docs/youtube-exclusion.md` and remains intact. Generic open animation demos do not satisfy an anime episode acquisition requirement.

## Local integration boundary

Inspected `providers/registry.ts`, `providers/eligibility.ts` and the existing playback documentation. The registry uses exact code-reviewed URLs/hosts, while the eligibility layer excludes YouTube. No arbitrary new iframe or media URL should enter the resolver to compensate for missing authorization. Existing local demo assets and historical source records are not newly approved anime sources.

Once a qualifying grant exists, first implement a local fixture for the exact asset and delivery contract. Verify same-episode mapping, YouTube exclusion, rejected alternate hosts/paths, unavailable states and supported player behavior without live database writes. Review any required origin/CSP or other security-sensitive configuration change separately before applying it. Local development does not authorize public endpoint exposure.

Do not enable a database source, run source-management writes or use the existing live integration suites against staging under the current constraints. Do not add an endpoint, migration or dependency merely to prepare for a hypothetical provider.

## Evidence needed to unblock integration

Obtain a rights-holder-published grant or privately supplied written authorization that identifies the exact asset, Philippines territory, BryxTV third-party playback permission, zero-fee terms, rights window and supported non-YouTube delivery method. Keep private agreements and credentials out of public source manifests. A reviewable record can contain public evidence links and nonsecret yes/no conclusions.

No outreach has been sent. Any future outreach needs an explicit instruction to contact the provider; a suggested business lead is not permission to send a message.

## Validation and scope

This phase adds this research document only. No application behavior changed, so no new playback test can establish a source that has not been supplied. Code tests/builds were not rerun and no live playback success is claimed. Repository whitespace was checked separately.

Prior Gate F changes and `.env.staging.example` are preserved. No authentication, Proxy, deployment settings, database configuration, environment variables or Neon records were changed. No migration, commit, push or deployment was attempted. Any such next action requires the owner's explicit approval; no approval request is pending from this research.

## Expanded Phase 6.5 implementation review

The detailed follow-up request adds Archive, Vimeo, AnimeEmbed, Yenime and VidRift research and a reusable integration fallback. The original research-only scope above describes the first pass; the following records the expanded work.

### Existing architecture

- `prisma/schema.prisma`: providers and sources already store provider identity, canonical title/season/episode, URL, authorization evidence and separate availability evidence. No migration is needed to reuse those fields.
- `providers/policy.ts`: requires an enabled registered provider, matching source type, authorization evidence, checked AVAILABLE status and exact canonical episode identity before producing a player DTO. Private evidence is omitted.
- `providers/resolver.ts`: server-side database resolution and per-title availability reuse that policy; no source is derived from a TMDB ID alone.
- `catalog/pages/details-page.tsx`: Watch Now depends on a resolved source; URLs retain season and episode. `components/watch-page.tsx` retains metadata and unavailable states, and reuses episode selectors/navigation.
- `components/source-selector.tsx`: revalidates source eligibility before choosing the existing Video.js or iframe component. `embedded-player.tsx` already uses a sandbox, explicit permissions, loading/timeout/retry UI and fullscreen handling. An iframe load event is not proof of video playback; cross-origin errors/cookie failures may only appear inside the provider frame.
- `globals.css`: `.embed-frame` already uses a responsive 16:9 aspect ratio and fullscreen/mobile rules.
- `next.config.ts`: frame origins derive from the code-reviewed registry; no wildcard frame permission is needed or added. Existing iframe permissions are not expanded by this work.
- `proxy.ts` and Better Auth family/session enforcement remain unchanged. The existing Gate F tests cover those boundaries with fixtures; deployed behavior remains unverified.

### Additional candidate table

“Needs Verification” is not approval. Compatibility and advertising claims below are provider documentation/claims, not newly observed playback.

| Provider / exact candidate | Authority / rights evidence | Embed and cost evidence | PH / compatibility / third parties | Final status |
| --- | --- | --- | --- | --- |
| Internet Archive; no exact episode cleared | An Archive upload or uploader-selected license alone is insufficient. No title-specific chain of authority was verified. | Official [embedding help](https://archivesupport.zendesk.com/hc/en-us/articles/360018377531-Movies-and-Videos-Tips-Troubleshooting) documents movie embedding. Free access alone is insufficient. | Exact asset, PH reachability, mobile/desktop playback, cookies and third-party requests untested. | Needs Verification |
| Vimeo; no exact rights-holder episode cleared | No verified uploader/full-episode rights package located in this pass. | Official [embedding help](https://help.vimeo.com/hc/en-us/articles/12426259908881-How-to-embed-my-video) documents embeds. Owner permission, privacy, domain restrictions and zero-fee delivery still require asset-level checks. | No specific player was tested on desktop/mobile or in PH. Scripts/cookies and branding are asset/account dependent. | Needs Verification |
| Morevna Project; **Morevna Episode 3**, with **Episode 3.0.2 (English)** as the delivery lead | Creator's [source page](https://morevnaproject.org/anime/episode-3-old2/sources/) identifies the work as CC BY-SA 4.0. [Creator portfolio](https://morevnaproject.org/) establishes production authority. This is stronger than an arbitrary upload. | [Commons file record](https://commons.wikimedia.org/wiki/File:Morevna_Episode_3.0.2_(English).webm) lists a 10:18 WebM, not an MP4/HLS feed. Its summary says BY-SA 4.0 while the licensing template says BY 4.0; clarify exact-version attribution/license rather than silently adopting the less restrictive template. Creator episode pages timed out on direct retrieval. | No PH or browser playback test. A Commons-hosted file is non-YouTube delivery even though its provenance cites YouTube; no extraction was performed. WebM delivery is outside current MP4/HLS adapter support. No provider/CSP addition made. | Needs Verification: promising rights lead, not an enabled source |
| AnimeEmbed; example generator references Solo Leveling / AniList IDs | [Own documentation](https://animeembed.com/) advertises technical embedding. No specific-content authority established. | Claims free embedding, fullscreen/mobile and HLS. No rights approval follows from its ID API. | PH authorization, actual compatibility, cookies and downstream scripts/advertising unverified. Demo player was not loaded. | Rejected for integration on current evidence; technical reference only |
| Yenime; documented Frieren / MAL 52991 demo | [Own documentation](https://api.yenime.net/) describes third-party aggregation and megaplay extraction, not a title-specific distribution grant. | Claims free, ad-free iframe/HLS delivery. These claims do not establish rights. | PH authorization, cookies, mobile/desktop operation and downstream scripts unverified; no stream requested. | Rejected for integration on current evidence; technical reference only |
| VidRift; documented Attack on Titan S1E1 example | [Own documentation](https://vidrift.net/) provides ID-based embedding and messages; no specific-content authorization established. | Claims free player and mobile/fullscreen controls. No episode grant established. | PH rights, actual compatibility, advertisements, cookies and downstream origins unverified; no stream requested. | Rejected for integration on current evidence; technical reference only |

No exact full episode has final Approved status, and none was actually played in a browser. No official external watch button is fabricated from these research leads. Morevna is an independent anime-style series, not a replacement claim for popular Japanese licensed catalogs.

### Reusable adapter and registration workflow

`providers/reviewed-source.ts` adds a **server-only**, strict review schema and adapter for trusted local review records. It includes provider/content/episode IDs, canonical mapping, iframe/direct type, approval status/evidence, free PH third-party rights assertions, separate playback verification and optional language/subtitle labels. It delegates to the existing `resolvedOptions` checks. The assertions require human evidence review; the adapter cannot authenticate licensing claims.

This adapter is intentionally not wired to an HTTP input, database writer or public resolver, and has no real-source manifest. Existing database integration continues unchanged. Optional language/subtitle labels remain private review metadata; they do not claim configured caption tracks. The adapter adds no provider, no origin and no capability to accept arbitrary URLs. Tests use synthetic local media mappings only.

To register a future source:

1. Review the exact-version rights chain, free third-party PH permission, duration/completeness, attribution (including music/translation) and any rights window. Record public evidence URLs or a private review reference; never put contracts or credentials in client DTOs.
2. Confirm a supported provider-owned asset, exact episode mapping and embed permission/delivery contract. Do not invent a TMDB mapping or derive a stream URL from a metadata ID.
3. Prepare exact host/path rules and provider-specific minimum iframe permissions. **Request approval before changing CSP or other security-sensitive configuration.** Current adapters do not support WebM or undocumented provider signing parameters; those need an explicit reviewed implementation.
4. Use trusted server records with `resolveReviewedSources` for a local fixture, or the existing database source model once database writes are separately authorized. Never expose the review schema as an approval API. A new boolean/evidence string is not independent rights verification.
5. Verify real playback, seeking, errors, fullscreen, mobile layout, third-party-cookie blocking and PH reachability before marking availability AVAILABLE. Add provider-specific regression tests. Keep the family gate enabled throughout.
6. Commit, push, deploy, migrate or modify security-sensitive configuration only after explicit approval. Gate F must also be resolved before family rollout; this adapter grants no rollout permission.

### Validation record

New tests cover review/availability separation, denied territory/free rights, malformed records, unregistered providers, unsafe URLs, source-type mismatch, exact episode mapping, missing sources and private-evidence omission. Existing player, resolver and Gate F suites are reused for rendering/fallback and authorization regression coverage.

An initial offline suite run incorrectly inherited a synthetic staging policy for every test, producing four existing Google fixture failures (85 passed, 6 skipped). That test harness override was corrected for the normal test run; no auth policy or application code was changed to address those failures. The build alone uses a synthetic staging allowlist. Test/build child processes have empty real DB/auth/provider connection variables and no live integration opt-in flags; persistent environment files are untouched.

Final validation used installed **Node v22.12.0**, matching the project's supported engine. An intermediate Node v20.19.5 run passed core/UI tests but failed the existing security suite during alias/module-mock loading; no tests were changed to hide that runtime incompatibility.

| Final check (Node 22.12.0) | Result |
| --- | --- |
| `npm run lint` | Passed |
| `npm run typecheck` | Passed |
| `npm test` core/fixture suite | 89 passed, 6 opt-in live tests skipped |
| UI suite (included in `npm test`) | 21 passed |
| Gate F security suite (included in `npm test`) | 4 passed |
| `npm run build` | Passed locally with synthetic staging list and empty real service credentials |
| `git diff --check` | Passed |

**Total: 114 passed, 0 failed, 6 skipped.** New adapter contributes three tests. DOM fixtures do not verify real cross-origin playback, fullscreen, third-party-cookie behavior or physical devices. No full episode was played in a browser. No database integration writes or deployment occurred.

Files added/updated by this expanded phase: `src/features/playback/providers/reviewed-source.ts`, `tests/reviewed-source.test.ts`, and this document. All pre-existing Gate F and environment-template changes remain untouched.

**Staging deployment recommendation: NO-GO.** The requested playback success criterion is unmet and Gate F remains NO-GO. The reusable local review bridge is ready for a verified asset, but is intentionally not connected to public resolution. Next work requires exact-version rights/attribution confirmation and supported delivery; if a new provider requires CSP/origin configuration, explicit approval is required before applying that security-sensitive change. There is no pending tool approval.
