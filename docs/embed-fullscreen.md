# Phase 6.0.2 — external embed fullscreen

## Investigation before edits

Tested the existing signed-in Valkaama development preview on 2026-10-23, before
modifying the player or styles. Inspected DOM bounds and computed styles for the
wrapper, iframe, section, watch page, body and html; inspected the route transition
implementation and global CSS.

The current Phase 6.0.1 code already requested fullscreen on `.embed-frame`, rather
than directly on its iframe. Before edits its normal desktop dimensions were
1162.625 × 653.969 (16:9). No active ancestor transform, overflow clipping container,
max-width restriction or animation was constraining native fullscreen. The native
fullscreen wrapper and iframe both measured 1440 × 2560 at (0,0), equal to the actual
fullscreen viewport. Thus the originally reported small image was not reproducible
as a parent-container CSS defect in this clean desktop test.

The observable mismatch occurs when combining the in-app browser's 390 × 844
viewport emulation with OS-native fullscreen: DOM dimensions report the emulated
viewport, while the screenshot compositor maps that small rendered surface into
the larger native fullscreen surface. The overlay and film both become small in
that screenshot. Resetting viewport emulation restores correct full native sizing.
This is evidence of an emulation/native fullscreen mismatch; it is not proof of a
physical mobile browser defect. Letterboxing on a portrait native fullscreen
surface is expected for a landscape film and must not be removed by stretching or
cropping its video.

The initial Phase 6 implementation also selected the iframe directly; Phase 6.0.1
had already changed that to the wrapper. This phase retains that selection rather
than claiming it is a new fix. A second legitimate path remains: the provider can
request fullscreen inside its iframe. It needs explicit iframe fullscreen styles,
separate from the outer wrapper's styles.

## Changes

- Give the iframe absolute inset-zero dimensions within the existing relative 16:9
  wrapper. This makes its sizing independent of normal document flow.
- Size the wrapper to the browser-supplied fullscreen containing block, clear
  min/max dimensions, margin, padding, borders, transforms, rounding and aspect ratio.
- Add direct iframe `:fullscreen` and WebKit fullscreen styles for the provider's own
  fullscreen path. No script is injected into the provider and its video aspect
  ratio remains under provider control.
- Track standard `fullscreenchange` events and offer an accessible Exit fullscreen
  button inside the fullscreen wrapper. The iframe is retained throughout entry/exit.
- Handle unavailable/rejected fullscreen requests without synchronous exceptions or
  falsely changing playback into an error state. Unsupported browsers retain inline
  playback and can use their provider's supported native control.

Reference: https://fullscreen.spec.whatwg.org/ and
https://developer.mozilla.org/en-US/docs/Web/API/Fullscreen_API/Guide .

## Browser results

| Check | Observed result |
| --- | --- |
| Desktop, BryxTV Fullscreen | Wrapper and iframe at (0,0), 1440 × 2560, equal to native fullscreen viewport; real Valkaama credits visible at appropriate width with letterboxing |
| Desktop exit | Exit fullscreen button worked; zero fullscreen elements; normal 1162.625 × 653.969 dimensions restored; source selection preserved |
| Archive's own Fullscreen | Parent iframe at (0,0), 1280 × 720, equal to reported viewport; `:fullscreen` matched IFRAME |
| Archive's own exit | Provider Exit Fullscreen worked; zero fullscreen elements afterward |
| Mobile inline, 390 × 844 | Wrapper and iframe 343 × 192.9375; exactly 16:9 |
| Mobile fullscreen emulation | DOM wrapper and iframe 390 × 844 at (0,0), but native screenshot scaling mismatch persists; not claimed as physical-device verification |
| Mobile exit | Exit button worked; restored 343 × 192.9375, exactly 16:9 |
| Real playback | Actual film continued through fullscreen entry/exit; provider clock reached 01:08; iframe not replaced |
| CSP | No Content Security Policy rejection in captured browser logs |

Desktop verification is limited to the available in-app browser. Safari/Firefox and
physical iOS/Android fullscreen, rotation and browser chrome changes still need manual
checks. The existing browser's viewport emulation is not a reliable visual proof of
native mobile fullscreen. No global resize events, synthetic provider events, iframe
DOM manipulation, arbitrary URL permission or security relaxation were introduced to
hide that limitation.

## Safety and regression checks

No CSP, sandbox, hostname allowlist, provider registration, database schema, source
selection, Video.js or history logic changed. Both database connections were checked
against development branch `br-raspy-sun-az80iq7r` before creating disposable test users.
Source `cmvl2hp6x0000edsb4r2a9mqi` remains disabled and UNKNOWN, with no verification
timestamp. Public API/guest preview checks still exclude it, and the disposable
preview account had zero viewing-progress rows. Only temporary test fixtures are
removed during cleanup. No production, migration, commit or push operation occurred.

- ESLint and TypeScript: passed.
- Offline tests: 48 core tests and 12 UI tests passed. Four optional live suites are
  skipped by the offline command and executed separately against development.
- Live auth, history, playback/Continue Watching and My List regression suites: all four
  suites passed, eight tests including authentication subtests.
- Production build: passed with external credentials explicitly blank.

UI tests cover wrapper fullscreen targeting, explicit and browser-driven exit,
unchanged iframe identity, unsupported API, rejected request, preserved player status,
source selection, security attributes and untrusted progress messages.

## Files modified in this phase

- `src/features/playback/components/embedded-player.tsx`
- `src/app/globals.css`
- `tests/ui/playback-sources.test.tsx`
- `docs/external-embed-verification.md` (follow-up reference)
- `docs/embed-fullscreen.md` (this report)

## Remaining manual steps

Use the existing authenticated localhost preview:
`/watch/movie/74890?preview=cmvl2hp6x0000edsb4r2a9mqi`.
In desktop Chrome, Safari and Firefox, enter and exit both BryxTV and provider fullscreen.
Check that the iframe fills its actual fullscreen viewport, controls remain usable,
letterboxing preserves the film, and exiting restores 16:9 without a reload.
Repeat on physical mobile devices in portrait and landscape where fullscreen is
permitted. Continue the Phase 6.0.1 playback checklist before any source approval.
This phase does not approve or enable the source.
