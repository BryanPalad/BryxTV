# Phase 6.5.1 — Morevna exact-version verification

Date: 2026-11-17 (Asia/Manila). Branch: `staging`.

**Outcome: integration stopped at source verification. No complete episode played inside BryxTV.** No source was registered, no application code or CSP changed, and no database was contacted. This report supersedes the earlier assumption that WebM necessarily requires a new playback dependency.

## Exact candidate and provenance

- Candidate: **Morevna Episode 3.0.2 (English)**, not the earlier Russian release, French version, Episode 4 or the project demo.
- Publisher's [English release announcement](https://morevnaproject.org/2017/11/10/morevna-episode-3-0-2-released-english/) (2017-11-10) specifically identifies the updated edit and animation, English voice cast and translation contributors. Search retrieval exposed the announcement; direct page requests timed out. No embedded YouTube player was used or extracted.
- Publisher's current [Episode 3 page](https://morevnaproject.org/anime/episode-3/) search retrieval identifies Duffy Weber and Marielena Alcaraz in the English cast, soundtrack credits and CC BY-SA 4.0 source licensing. Direct requests timed out through the research tool; browser navigation to the official release page also timed out.
- The publisher's [older Episode 3 page](https://morevnaproject.org/anime/episode-3-old2/) explicitly offers English/Russian/French and identifies CC BY-SA 4.0. This supports the publisher's license choice, but does not itself authenticate the bytes of an independently uploaded copy.
- [Commons file record](https://commons.wikimedia.org/wiki/File:Morevna_Episode_3.0.2_(English).webm): 10:18, 1920×1080, VP8/Vorbis WebM, approximately 132 MB. File history identifies an import by **Tyler de Noche**, 2018-09-12, from a video attributed to Morevna Project. It is not a publisher-owned upload established by this review.
- Exact **candidate** media URL obtained from that record's Original file link:

  `https://upload.wikimedia.org/wikipedia/commons/a/a7/Morevna_Episode_3.0.2_%28English%29.webm`

  This is not an approved playback URL. The research tool's attempt to open the media link returned unsupported `video/webm`; it was not a successful media/browser playback check. No unverified mirror was substituted.

## License conflict: what is established and what is not

The publisher's Episode 3 materials support **CC BY-SA 4.0**, while the Commons file's description also says BY-SA 4.0 but its licensing template and structured data say **CC BY 4.0**. These are different licenses. This review found no publisher statement establishing a separate BY-only grant for the exact English file, so the Commons template is not used as authority to discard ShareAlike.

The supported implementation policy is therefore to retain the publisher's **BY-SA 4.0** terms, credits and any asset-specific notices. That is a choice of supported upstream grant, not a claim that the Commons inconsistency has been corrected or its origin explained. Nor is it a reason to assume every project asset/version has identical rights.

The [CC BY-SA 4.0 legal code](https://creativecommons.org/licenses/by-sa/4.0/legalcode.en), sections 1(l), 2(a)(1) and 3, supports royalty-free worldwide sharing/public communication under its conditions. Thus a verified covered copy need not receive a bespoke permission letter naming BryxTV or the Philippines simply because it will be streamed. Attribution, license links, modification notices and applicable ShareAlike obligations must be retained; license permissions do not establish a hosting service's hotlink behavior or actual geographic reachability.

**Remaining exact-copy blocker:** the available evidence does not establish a publisher-linked non-YouTube asset or a comparison authenticating this Commons file against the publisher's exact 3.0.2 English release. A matching title, runtime and copied description alone were not treated as that verification. The public template conflict remains unexplained. We therefore cannot mark this hosted candidate Approved under the requested exact-version standard.

The publisher's [itch.io listing](https://morevnaproject.itch.io/morevna-anime) identifies `Morevna-Episode-3.0.2.mp4` and a free official download route. Its [Gumroad Episode 3 listing](https://morevnaproject.gumroad.com/l/morevna-episode-3) advertises MP4/WebM in English/Russian and a zero-price download. These are publisher delivery leads, not stable streaming URLs or proof of this Commons file's identity. No purchase, checkout, account creation, alternate stream extraction or file rehosting was performed.

## Embedding and compatibility

No exact publisher-approved **iframe endpoint** was verified. The candidate above is a media file, not an iframe player URL. Rights to share a verified covered copy under CC and verification of an exact provider delivery endpoint are separate checks.

Installed `@videojs/react` documentation at `node_modules/@videojs/react/docs/reference/components/video.md` says `Video` forwards native video attributes/events and uses the browser media API. The existing `video-player.tsx` uses this component for non-HLS media. Therefore **WebM can potentially use the existing native Video.js path without a new dependency**, subject to actual browser support for the supplied VP8/Vorbis codecs, host CORS/range responses and playback tests. This has not been browser-verified here.

Current BryxTV types/validation/registry intentionally permit MP4/HLS rather than WebM. `policy.ts` maps direct providers to those two source types, and remote media origins are not currently approved. Passing a `.webm` file as a fake MP4 provider would misrepresent the source and is not done. A future integration needs explicit WebM modeling, exact URL approval and any separately approved CSP origin changes; it need not rebuild Video.js or add a transcoder dependency by default.

The existing iframe player does not make a direct WebM file into an authorized provider embed. No iframe permissions or sandbox settings were changed.

## Verification results and changes

| Check | Actual result |
| --- | --- |
| Official exact-version announcement | Located via primary-source search retrieval; direct/browser access timed out |
| Publisher license choice | BY-SA 4.0 supported; no verified exact-file BY-only grant |
| Exact hosted copy / delivery approval | Unverified; integration stopped |
| Complete episode in BryxTV | **Not played** |
| Play/pause, seeking, fullscreen | Not tested with this episode |
| Desktop/mobile/physical-device playback | Not tested |
| Episode-unavailable browser fallback | Not newly tested in this phase |
| Existing reviewed-source tests, Node 22.12.0 | 3 passed, 0 failed; synthetic policy tests only |
| `git diff --check` | Passed |
| Lint/typecheck/full suite/build | Not rerun: documentation-only change; previous results are not claimed as fresh |

Only `docs/phase-6.5.1-morevna-verification.md` was added. All earlier local changes are preserved. No authentication, Proxy, family access, Vercel protection, environment files, Neon configuration or records changed. No commit, push or deployment occurred.

**Next prerequisite:** obtain an accessible publisher-linked exact English asset with verifiable release/license correspondence, or sufficient provenance to authenticate the Commons copy and retain the publisher's license. Then review delivery and local WebM integration before testing real playback. Gate F remains NO-GO; this research does not authorize staging deployment or family rollout.
