# Accessibility and device completeness

Implementation scope: [issue #28](https://github.com/danielluis07/ocean-drive/issues/28),
hardening both presentations after Assisted Return (#26) and resilience (#27).

## Contracts

**Semantics.** One polite live region (`#expedition-announcer`, owned by the
Expedition provider) serves both presentations. It announces station opening,
completion and route choice, entering 3D (always paused), sailing and pausing,
and returning to Versão em texto with the place preserved. Each message clears
the region and restores the text on the next frame, so repeats are announced
even where assistive technology ignores whitespace-only changes. Readiness and failure
reasons remain in the presentation bar's status. Evidence progress is available
as text in the editorial route (labelling its `progress`) and in the 3D helm
controls, so progress never depends on beacon light, color, or depth. Named
control clusters (helm, signal navigation, connected actions) are `group`s.

**Switching.** Presentation changes keep every canonical Expedition State field
except the presentation itself, pause sailing, close Caderno de bordo and the complete source list, and focus
the matching passage, the movement control, or the editorial heading. The
approved identity disclosure (Pesquisa histórica · expedição fictícia) is not an
optional source disclosure and keeps its default.

**Keyboard.** Every focus stop has a visible outline and is scrolled clear of the
sticky presentation bar: `useStickyScrollOffset` measures the bar (it wraps at
narrow widths and zoom) and drives `scroll-padding-top`. Focus scrolling honors
reduced motion. Escape closes an open Caderno and returns to its signal: in the
reader, the visible Caderno; on the editorial page, only the Caderno holding focus,
so Escape elsewhere never pulls focus. In the 3D reader a second Escape returns to
the sea. Escape never
changes presentation. Steering remains available through A/D, arrows, and the
semantic turn buttons; Tab always leaves the canvas.

**Layout.** The viewport uses `viewport-fit=cover`; the presentation bar, skip
link, page shell, ocean caption, helm controls, and reader pad with
`env(safe-area-inset-*)`. Zoom is never restricted. In viewports up to 600 CSS px
tall the presentation bar is not sticky, because the ocean view itself scrolls
there and a sticky bar would cover destination labels. When a narrow viewport is
also short (≤800 × ≤600 CSS px, e.g. 200% and 400% magnification of a 1280×1024
window and small landscape phones such as 667×375), the 3D reader leaves its fixed split
layout for one document scroll and the presentation bar stops being sticky, so
Voltar ao mar, Acessar fonte, and Voltar ao sinal stay reachable. Beacon labels
are projected from their scene anchors but vertically kept inside the ocean view
(`keepBeaconLabelInView`); horizontal position is untouched, so labels never
become edge waypoint arrows. Wider short viewports (844×390 landscape,
960×540 for 200% of 1920×1080) keep the split reader; the layout journeys verify
its actions stay reachable there.

**Contrast.** Jade copy uses `--jade-text` (deep on light surfaces, pale on dark
ones). Convergência's dark surface now outranks the alternating station
background, and Caderno's return action carries explicit colors in both
presentations.

**Cross-engine readiness.** Three's `compileAsync` polls every compiling material
until its program is ready. Disposing the ocean material during that poll (React
Strict Mode remounts in development, or a quality-tier/baseline-water swap) threw
from the poll and stranded readiness; Firefox's parallel shader compilation made
it visible. A replaced or unmounted material is now released only after the
compilation that includes it settles, and never while it is still live.

## Automated evidence

`bun run test:browser` runs every journey in Chromium and the `@critical`
journeys in Firefox and WebKit, all pinned by `@playwright/test` 1.58.2:

- `accessibility.e2e.ts` — axe-core WCAG 2.0–2.2 A/AA scans of loading, entry,
  editorial station, Caderno, route choice, Convergência and its Caderno,
  completion, all sources, 3D entry, sailing (with Controles open), reader,
  Caderno, Convergência, completion, reduced-motion text and 3D, and essential
  failure;
  reduced-motion focus scrolling; named groups, progress, and announcements, including repeats.
- `presentation-switching.e2e.ts` — atomic switching at entry, while sailing, at
  every Field Station with Caderno open from both presentations, at completion with
  the source list open, during loading, and after a recovered context loss; focus
  is checked in both directions.
- `keyboard.e2e.ts` — visible and unobscured focus through both presentations,
  no traps, and Escape layering.
- `layout.e2e.ts` — desktop 1440×1000, portrait 390×844, landscape 844×390,
  640×512 and 960×540 (200%), and 320×256 (400%): no page overflow or clipped text, reachable
  reader and helm actions, and no label/reader or label/interface collision;
  WCAG 1.4.12 text spacing with web fonts blocked; `viewport-fit=cover`.

Zero axe violations are allowed. Each scan writes `axe-<state>.json` to the test
output and adds `axe-incomplete` annotations; incomplete rules are never passes.
Scans park the pointer first so hover color transitions are not sampled mid-way.

Engine notes for these runs: install browsers with
`node node_modules/playwright/cli.js install chromium firefox webkit` on the
restricted Windows host. All three headless engines reach real WebGL readiness
here, but software rendering still certifies behavior only. Playwright's WebKit
keeps links out of sequential focus (Safari's default without full keyboard
access), so its focus walk ends at the last button; Chromium and Firefox walk
every link. In development, focus after the last control can enter the Next.js
overlay, which is not shipped content. The journey fixture's controlled clock
spans the browser context, so it now tolerates auxiliary pages (axe's scanner
page, source popups) closing mid-advance.

## Alternatives

- Color, light, and depth: station state and progress are always text (route
  status, beacon label wording, helm progress).
- Motion: the Accessible Editorial Presentation carries the whole Expedition;
  reduced motion opens it by default and reduced-motion 3D holds the camera still.
- Drag and precise pointing: A/D, arrows, and the semantic turn buttons steer;
  forgiving approach zones open stations on arrival, and axe `target-size`
  (WCAG 2.5.8, 24 px minimum) passes in every scan.
- Hover: no content or action is hover-only.
- Sound: the experience has no audio.

## Incomplete rules for manual review

Latest Chromium run, all 19 scanned states: only `color-contrast` (text over the
opening gradient, ocean canvas and caption, and content beneath sticky UI or
off-screen during the scan). Verify ratios against rendered pixels. The earlier
`aria-prohibited-attr` items were resolved by giving named clusters `group` roles.
Firefox and WebKit incomplete-rule reports were not yet aggregated (see below).

## Still unvalidated

This host (6 GB RAM, software WebGL) could not finish one uninterrupted full run:
the system stopped the dev server and suite for low memory. Before the review
fixes, Firefox and WebKit passed every critical journey except the two long
complete journeys, which were not attempted there. The complete journeys and the
Assisted Return journeys failed intermittently in Chromium under memory pressure;
the same Assisted Return journey also passed and failed at the base commit
(050de01), because its travel tolerance depends on host speed.

Automated scans and software-rendered engines prove behavior only. NVDA/Firefox,
VoiceOver/Safari on macOS and iPhone walkthroughs, manual WCAG 2.2 AA review
(including rendered contrast, magnification at real zoom, and safe areas on
notched hardware), and physical-device runs remain Release Dossier gates.
