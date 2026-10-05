# Issue #70 — Abrolhos terrain and lighthouse candidate

## Status

Implementation candidate with **owner visual approval on 2026-10-05**.
[Approval record](issue70/human-approval.json) binds the response to this exact
production build and the reviewed captures.
Desktop sailing performance is **nonpassing**: the final candidate retained
Balanced, but both isolated runs exceeded the unchanged 20 ms p90 target
(worst windows 29.5 ms and 38.5 ms). No passing comparison is claimed.
Physical-phone performance remains **unvalidated**; the owner previously
confirmed that no phone is available. Desktop phone-viewport captures are art
emulation, not physical-phone evidence. Rollout is not complete.

Starting commit: `4f4a24f2bf92fb391dba92ebf0e8f928931e0b04` (merged Boipeba
village work). [Baseline asset hashes](issue70/baseline-assets.json) retain the
starting visual files. All other islands' terrain and Boipeba's feature geometry,
occupied atlas pixels and encoded placements are preserved. No attempt was made
to recover the lost historical #68 assets.

Final production build:
`4f4a24f2bf92fb391dba92ebf0e8f928931e0b04-01122ab15a29fe51`.
[Candidate hashes](issue70/candidate-assets.json),
[repeat-build comparison](issue70/reproducibility.json) and
[preservation report](issue70/preservation.json) identify this combined candidate.

## Implementation and provenance

- Native 1024px colour/normal and independent 512px colour-only baking, with
  mostly exposed weathered rock, thin grass and almost no beach. The masks
  omit Noronha's raised scrub crowns. No trees or vegetation meshes are added.
- Six disconnected retained coastline rings, low displayed rock tables and
  broad 6.8-unit reef shallows. Land does not bridge inter-island water.
- The unchanged Balanced scalar accessibility is rasterised into linear colour
  once. Vertex pigment/occlusion remains the missing-texture fallback. Optional
  loading, decode/upload outside passages, bounded retention and adaptive
  quality safeguards remain active.
- Authored relief is bounded to ±0.045 world units and vanishes at the shore.
  It is an interpretation, not new surveyed geography. The retained OSM coast
  and SRTM grid are unchanged. See [terrain provenance](../third-party/abrolhos-terrain.md).
- Full 3D Farol de Abrolhos at retained OSM node 1181469524
  (-38.694069, -17.9648083): black-and-white tower, two galleries, guardrails,
  lantern, dome, finial and footing. No generic buildings or cutouts are added.
  [References, rights, modelling and atlas transformations](../../data/landmarks/features/abrolhos/README.md)
  retain the licensed photographs, source pages, legal codes and offline source.
- The lighthouse replaces the placeholder in slot zero of the shared library.
  Boipeba keeps its model slots and attributes. New tiles occupy unused regions
  of the existing 1024px atlas. One opaque material remains. No AI generation
  was used. The reconstruction and atlas adaptation are CC BY-SA 4.0, with
  in-experience attribution; Boipeba's original asset licences remain recorded.
- Close framing is configured at 48° pitch, north bearing, half aerial distance
  and a 0.8-unit target height. #72 still owns the user interaction.

## Visual evidence

The existing `terrain-detail` harness targets this Stop through
`TERRAIN_ISLAND=abrolhos`. `TERRAIN_HIDE_FEATURES=1` provides natural-terrain
review independently of named Features. The preliminary terrain-only candidate
was inspected before lighthouse integration. All ten views were repeated with
the final sampling and features hidden; [final natural-only settings](issue70/natural-final/capture-settings.json)
identify that review set, including [Balanced Close View](issue70/natural-final/desktop-balanced-close.png)
and [phone Low Close View](issue70/natural-final/phone-low-close.png).

Matched views use the production camera, viewport and DPR: desktop 1280×800,
phone 390×844, device DPR 1, render DPR 0.9 for Balanced and 1 for Low. Both
camera framings retain settings and diagnostics, and verify active 3D/tier
before and after screenshot readback. The [capture comparison](issue70/capture-comparison.json)
checks matching before/final/natural settings and the final build identity for
all ten affected views. Colour-only Balanced exercises the
production modest-GPU normal-map omission. Texture fallback returns 404 for
optional terrain maps. Close captures hide the Stop Card by opacity solely
for art inspection; ordinary card placement is checked separately.

| Treatment | Before / final aerial | Before / final Close View |
| --- | --- | --- |
| Desktop Balanced | [Before](issue70/before/desktop-balanced-aerial.png) / [Final](issue70/after/desktop-balanced-aerial.png) | [Before](issue70/before/desktop-balanced-close.png) / [Final](issue70/after/desktop-balanced-close.png) |
| Balanced colour-only | [Before](issue70/before/desktop-colour-only-aerial.png) / [Final](issue70/after/desktop-colour-only-aerial.png) | [Before](issue70/before/desktop-colour-only-close.png) / [Final](issue70/after/desktop-colour-only-close.png) |
| Desktop Low | [Before](issue70/before/desktop-low-aerial.png) / [Final](issue70/after/desktop-low-aerial.png) | [Before](issue70/before/desktop-low-close.png) / [Final](issue70/after/desktop-low-close.png) |
| Phone Low | [Before](issue70/before/phone-low-aerial.png) / [Final](issue70/after/phone-low-aerial.png) | [Before](issue70/before/phone-low-close.png) / [Final](issue70/after/phone-low-close.png) |
| Missing textures | [Before](issue70/before/desktop-fallback-aerial.png) / [Final](issue70/after/desktop-fallback-aerial.png) | [Before](issue70/before/desktop-fallback-close.png) / [Final](issue70/after/desktop-fallback-close.png) |

Required ordinary `asset-art` views for human approval:
[desktop Balanced](issue70/asset-art/desktop-balanced-stop-03.png),
[desktop Low](issue70/asset-art/desktop-low-stop-03.png),
[phone Low](issue70/asset-art/phone-low-stop-03.png).
The owner approved these three required views and the final Balanced Close View
in this conversation on 2026-10-05, replying **“Approve these visuals”**.
The approval covers the final visual candidate; it does not establish device
performance. Automated capture success alone does not constitute approval.

## Offline builds and verification

Final measurements, candidate hashes, repeat-build comparison, test results and
production-browser reports are retained alongside this report. Per-tier limits
and the 1.8 MiB complete visual allowance are unchanged. Initial failed builds
are retained in `issue70/logs/`: the first sampling attempts exceeded the
Balanced/Low mesh byte limits; the first combined attempt exceeded the total
visual allowance by 2,816 bytes. Island-specific sampling leaves byte headroom.
The first combined production request check also measured 2,124,260 bytes at
entry, exceeding the unchanged 2,097,152-byte minimum-sailable limit. The final
Balanced sampling leaves additional transfer headroom; the failed browser
report is retained; the final budget check passed after that reduction.

Final verification:

- `bun test`: **253 passed**, including the real-library atlas regression,
  full Feature geometry, occupied atlas/attribute preservation, native baking,
  single AO treatment, fallback, preparation and placement checks.
- `bun run lint`, `bun run typecheck`, `bun run build`: passed.
- `bun run assets:record` and `bun run assets:audit`: **122 records verified**.
- Two final `bun run landmarks:build` runs are byte-identical across all
  **23 shipped model/texture files**. Only the five Abrolhos terrain files and
  shared Feature GLB changed. The Boipeba encoded placement array is identical.
- Final production request/provenance/scene checks: **2 passed**. The
  [retained budget report](issue70/production-budget-report.json) records the
  exact final build's transfer, requests and scene measurements.
- Final combined camera/texture/art checks: **25 passed** (ten native terrain
  views, three texture-loading cases and twelve ordinary asset-art captures
  across all four islands). The final natural-only rerun also passed all
  **ten** views. These automated results are recorded separately from the
  owner's visual approval.
- Ordinary card placement passed all five viewport cases, each traversing all
  five Stops. The initial run passed four cases; landscape phone timed out
  during browser-context setup before test execution. Its [trace](issue70/card-placement/landscape-startup-timeout.zip)
  and [failed-run log](issue70/logs/card-placement.txt) are retained. The isolated
  [landscape rerun](issue70/logs/card-landscape-rerun.txt) passed. The retained
  [production placement configuration](issue70/card-placement-config.txt) shows
  the focused selection; this does not claim the complete Stop Card suite ran.

| Abrolhos resource | Baseline | Final | Limit |
| --- | ---: | ---: | ---: |
| Balanced terrain triangles, skirt and shallows | 11,873 | 11,587 | 15,000 |
| Balanced terrain bytes | 215,968 | 211,408 | 256,000 |
| Low terrain triangles, skirt and shallows | 1,248 | 1,198 | 1,300 |
| Low terrain bytes | 28,536 | 27,376 | 28,672 |
| Balanced colour + normal bytes | 63,168 | 16,998 | 153,600 |
| Low colour bytes | 11,470 | 3,106 | 153,600 |
| Abrolhos expanded Feature triangles | 90 (placeholder) | 1,368 (lighthouse) | 3,000 |
| Shared Feature file bytes | 159,088 | 199,036 | 204,800 |

The smaller terrain transfer follows selective coast/slope sampling and
untextured-ocean gutters in the native baker, with six retained land rings;
texture dimensions remain 1024/512px. The native colour/normal treatment and
the missing-texture vertex fallback are visually reviewed separately.

| Production measurement | Final | Limit |
| --- | ---: | ---: |
| Minimum-sailable transfer | 2,088,575 | 2,097,152 |
| Complete visit | 3,000,801 | 5,242,880 |
| Essential visuals | 1,089,028 | 1,310,720 |
| All visited visuals | 1,644,188 | 1.8 MiB |
| Conservative all-tier files on disk | 1,849,274 | 1.8 MiB |
| Balanced scene triangles / draws / render targets | 48,114 / 5 / 2 | 149,999 / 99 / 2 |
| Phone Low minimum-sailable transfer | 974,475 | 2,097,152 |
| Phone Low scene triangles / draws / render targets | 8,222 / 2 / 0 | 149,999 / 99 / 2 |

Entry transfer remains close to its cap (8,577 bytes headroom). Future island
additions need another measured comparison; these limits have not been raised.

The first combined camera review also caught vertically inverted lighthouse
UVs: the black bands sampled unused white atlas pixels. A representative failed
Balanced Close View, its settings/diagnostics and the old candidate hashes are
retained under `issue70/atlas-orientation-review/`. A regression
check reads the actual retained library's stripe UVs against the shared atlas;
it failed on the old library after the white band passed, and must pass after
the top-origin glTF mapping correction. Final affected camera views and build
hashes are repeated after that correction. Automated capture checks alone did
not detect the artistic defect.

The initial `bunx --bun playwright` benchmark failed before rendering because
Bun interpreted Playwright's Windows worker path as a dependency name. The
subsequent runs use the established `bunx playwright` command with Bun serving
the production application. That launch failure is not performance evidence.

## Physical desktop evidence

Both baseline runs used AMD Radeon RX Vega 10 / Ryzen 7 3700U, Windows
10.0.26300, Chrome 154.0.8037.93, viewport 1522×632 and device DPR 1.25. Each
ran five active minutes through the real route without locking adaptive quality.
Every scored-window p90, GPU timing where available, DPR/quality changes and
exact production build identity remain in the retained JSON.

- [First baseline run](issue70/before-performance/ocean-voyage.json):
  323,396 active ms, 159 windows, worst p90 36.4 ms, 8 windows over 20 ms.
  Balanced was retained. No builds or browser captures ran concurrently;
  source/reference maintenance overlapped part of the run.
- [Isolated baseline rerun](issue70/before-performance-clean/ocean-voyage.json):
  326,755.8 active ms, 161 windows, worst p90 340 ms, 13 windows over 20 ms.
  Balanced was retained, with adaptive DPR 0.9–1. No builds, downloads or
  browser captures ran concurrently. The cause of the host's intervals is
  unestablished; this failed run is not discarded or treated as a pass.

- [Final candidate run](issue70/after-performance/ocean-voyage.json):
  324,193.7 active ms, 160 windows, worst p90 29.5 ms, 10 windows over 20 ms.
  All 160 windows contain GPU timing; worst GPU p90 is 16.169 ms. Balanced
  was retained, with adaptive DPR 0.9–1, no renderer/page errors and no
  fallback. The host, browser, viewport and device DPR match the baseline.
  No builds, downloads, source edits or other browser captures overlapped
  this run. The failing assertion is the per-window Chrome timing gate.
- [Isolated final repeat](issue70/after-performance-repeat/ocean-voyage.json):
  325,258.3 active ms, 160 windows, worst p90 38.5 ms, 22 windows over 20 ms.
  All 160 windows contain GPU timing; worst GPU p90 is 15.879 ms. Balanced
  was retained, with adaptive DPR 0.9–1, no renderer/page errors and no
  fallback. Hardware, browser, viewport and device DPR were unchanged.
  No builds, downloads or other browser captures overlapped. A small
  verification-document update recorded the first result and owner approval
  while the repeat ran. The same timing assertion failed; neither final
  result is discarded.

The [window review](issue70/performance-window-review.json) retains the failed
intervals from both baselines and both final-candidate runs. Both settled and passage
windows exceed the gate. GPU timing alone does not establish the cause of the
remaining frame-interval failures. Baseline failures and a lower candidate
maximum cannot establish a pass. The recorded owner visual approval does not
resolve desktop timing or the physical-phone evidence required before completed
rollout.

Each sailing run retains its complete timing/diagnostic JSON and representative
Abrolhos settled and passage screenshots (`stop-3.png`, `passage-2-3.png`).
Duplicate attachments and screenshots of unrelated Stops were removed during
PR preparation. The matched before/final views, final natural-only review,
required Stop 03 asset-art captures, licensed source records, candidate hashes
and failed-run logs remain. Scratch scripts, obsolete intermediate capture sets
and superseded successful-build logs were also removed; authored and shipped
assets are unchanged.

## Outstanding acceptance work

The owner visual review, authored assets, reproducibility, provenance, payload
budgets and focused production checks are complete for this candidate. Desktop
sailing remains nonpassing; its cause is unestablished and requires further
performance investigation before the existing gate can be signed off.
Physical-phone validation remains unavailable. The issue and rollout must not be
marked complete from this evidence.
