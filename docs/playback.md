# Authorized playback (Phase 4)

## Player choice

BryxTV uses `@videojs/react` and `@videojs/hlsjs-video` 10.2.0. During implementation,
Vidstack 1.15.7 was found to be deprecated, receiving security fixes only until
January 2028. The user requested the player appropriate for the long term, so the
maintained Video.js 10 successor was selected. No Vidstack dependency remains.
The installed package includes version-matched documentation under
`node_modules/@videojs/react/docs/llms.txt`.

The packaged Neutral video skin provides play/pause, seek, volume/mute, playback
speed, captions, time/duration, loading/error UI, fullscreen, keyboard shortcuts,
and picture-in-picture when supported by the browser. Playback does not autoplay.
The player loads only on playable watch routes; HLS media code loads only for HLS
sources. HLS prefers native playback when supported and otherwise uses the
bundled hls.js provider. No runtime CDN scripts are required.

## Sources and rights

`src/features/playback/data/sources.ts` is the server-only rights registry.
`src/lib/playback/resolver.ts` resolves exact media/season/episode identities.
The resolver requires `authorized: true`, an allowlisted URL, a valid target,
and an exact episode match. No user-supplied video URL is fetched or proxied.
TMDB metadata never supplies a video URL or playback entitlement. Normalized TMDB
items continue to have `isPlayable: false`; details and episode actions consult
the independent resolver.

Only demos are configured. Commercial movie and TV routes honestly show:
“This title is currently unavailable for streaming on BryxTV.”
Adding a licensed registry entry enables the corresponding detail/episode link.
Do not use that configuration until playback rights are verified.

| Demo | Format | Local asset |
| --- | --- | --- |
| `demo:big-buck-bunny` | MP4, H.264/AAC, ten seconds | `/playback/big-buck-bunny-excerpt.mp4` |
| `demo:big-buck-bunny-hls` | HLS VOD, fragmented MP4, same ten seconds | `/playback/bbb-hls/index.m3u8` |

Both appear under `/demos` and `/watch/demo/[id]`, independently of TMDB titles.
Total video assets are approximately 1.9 MB. The HLS version repackages the same
licensed excerpt without re-encoding; it is a single-rendition test, not an
adaptive bitrate ladder. FFmpeg was used temporarily outside project dependencies.

### Attribution and provenance

- Film: **Big Buck Bunny**, © copyright 2008, Blender Foundation / www.bigbuckbunny.org.
- Publisher permission: https://peach.blender.org/about/
- License: Creative Commons Attribution 3.0, https://creativecommons.org/licenses/by/3.0/
- Sample host: Test Videos, https://test-videos.co.uk/bigbuckbunny/mp4-h264
- Exact downloaded source: https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4
- Verified October 22, 2026: HTTP 200, video/mp4, 969201 bytes, byte ranges supported.
- Changes: the host trims/resizes/encodes the film to a ten-second excerpt; BryxTV
  serves that copy and creates an HLS package without re-encoding.
- Caption file: `/subtitles/bbb-demo.en.vtt`, original BryxTV demonstration text
  dedicated to CC0. It identifies the sample and demonstrates the subtitle
  controls; it is explicitly not a dialogue transcription or translation.

Attribution, source, license, modifications, and publisher credits are displayed
beside each player. Blender/Creative Commons logos are not copied.

## Watch and episode routes

- `/watch/movie/[id]` checks `tmdb:movie:ID`.
- `/watch/tv/[id]?season=1&episode=2` checks `tmdb:tv:ID`, season, and episode.
- `/tv/[id]?season=2` displays the selected season's metadata and availability.

IDs, seasons, and episodes are validated before requests. Specials use season 0;
episodes start at 1. Arrays, negative numbers, leading zeros, and non-integers are
rejected. TV seasons and episode metadata use the existing server-only TMDB
transport and 24-hour revalidation. Images use the existing TMDB image allowlist.
Metadata failures do not make a configured video unavailable or expose raw errors.

## Progress

`src/lib/playback/progress.ts` defines a versioned progress record separate from
storage. The player accesses localStorage only on the client. Keys include the
internal ID, season, and episode; records include a source version, position,
duration, timestamp, and completion flag. Invalid, incompatible, and over-180-day
records are ignored. A duration change also prevents restoring a stale offset.
Progress writes are throttled to five seconds and flushed on pause, end,
pagehide, visibility loss, and route teardown. A completed video starts again at
zero. Restart from Beginning replaces its offset with zero. Storage failures do
not stop playback. This data is device/browser-local and is not synchronized.

Future watch history can reuse the record schema behind an authenticated service.
Future signed playback should mint short-lived playback URLs server-side only
after entitlement checks. Provider management credentials must never enter the
serializable source model. Public demo files are public; this phase is not an
access-control system for paid content.

## CSP

`next.config.ts` restricts playback and manifest/segment fetching to self, allows
blob media/workers for HLS, and retains only the existing TMDB images and
privacy-enhanced YouTube trailer frame origin. There is no arbitrary URL proxy.
Next hydration scripts and packaged player styles require inline script/style
permissions under the current no-nonce configuration. Production does not allow
`unsafe-eval`. A future authenticated deployment can adopt nonce-based CSP.

When adding a reviewed playback CDN, update both `PLAYBACK_ORIGINS` and the CSP
media/connect allowlists; inspect its manifests to allow only required segment,
key, and subtitle origins. Never add broad wildcard origins to make an error go away.

## Verification

Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.
Playback tests cover exact authorization/episode matching, unsafe URLs, parameter
validation, versioned progress expiration/isolation, local media/manifest assets,
and validated TMDB season responses with caching. Browser checks cover the actual
player; platform-specific PiP, fullscreen, and native HLS remain browser capabilities.

### Browser verification performed

- MP4 and HLS: metadata loaded, playback advanced, keyboard seek reached 0:05,
  and pause worked on the local production/development builds.
- Mute/unmute, volume adjustment, 1.5× speed, captions on/off, and fullscreen
  entry/exit were exercised. The English demo track is enabled by default.
- A paused position restored after reload, and Restart from Beginning reset it.
- TV season selection changed the URL and returned that season's episode titles,
  thumbnails, descriptions, runtimes, and unavailable playback labels.
- Mobile viewport: player controls remained within the screen, with no horizontal
  overflow in the production build.
- Missing local video: the player displayed an error and recovery UI. The sample
  asset was restored after the fault test.
- Picture-in-picture was attempted but rejected as unavailable by the in-app
  browser. Native HLS was verified there; fallback MSE playback is configured
  through the supported hls.js adapter but still needs cross-browser/device QA.
