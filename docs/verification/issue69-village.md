# Issue #69 — Velha Boipeba village addition

## Status and approval

The owner approved the existing terrain-and-palms visuals on **2026-10-04**
and requested implementation of the village references. That approval is
recorded in the [terrain-and-palms report](issue69.md). This addition represents
Velha Boipeba through its named Igreja do Divino Espírito Santo, placed at the
retained mapped church coordinate. It leaves the approved terrain, Moreré
shallows, palms and the other islands intact.

The new church's [production resting view](issue69/village/asset-art/desktop-balanced-stop-02.png)
and [configured Close View](issue69/village/after/desktop-balanced-close.png)
are ready for human review. The earlier approval predates this model and is
not recorded as approval of the new village addition.

**Physical-phone performance remains unvalidated.** The owner previously
confirmed that no phone is available. Desktop phone-viewport captures below
record visual emulation only; rollout's device-evidence requirement remains open.

## Candidate identity and preservation

- Starting commit: `5844ec1da79fb118c373e84285b627a5e4b3e8a4`.
- Approved terrain/palms build used for the before sailing run:
  `5844ec1da79fb118c373e84285b627a5e4b3e8a4-2b492672087bdbf1`.
- Combined village candidate production build:
  `5844ec1da79fb118c373e84285b627a5e4b3e8a4-6a9b601f63f383e3`.
- [Starting asset hashes](issue69/village/baseline-assets.json) and
  [twice-reproduced candidate hashes](issue69/village/candidate-assets.json).
- Both final offline builds reproduced all 24 generated files: 21 public
  Landmark resources, the source Feature library, editable atlas and placements.
- All 20 public terrain meshes/maps are byte-identical to the approved starting
  candidate, including Boipeba's five terrain resources.
- The [preservation comparison](issue69/village/preservation.json) confirms
  unchanged position, normal, colour and UV attributes for the existing palm
  and Abrolhos meshes, all previous placements, and the decoded palm atlas
  region's pixels. The shared library changes only to add the church and its
  atlas regions/metadata.

The branch already contained the terrain-and-palms work when village authoring
began. This report compares against that approved working candidate, rather
than treating the older committed terrain as the village baseline.

## References and reconstruction

The [reconstruction record](../../data/landmarks/features/boipeba/README.md)
and [source ledger](../../data/landmarks/features/boipeba/sources.json) retain
references, rights evidence, licences, retrieval dates, geographic records,
tooling, UV transformations and the offline build.

The original Waltson Campos CC BY-SA 3.0 front photograph supplies the blue
facade, white trim, curved pediment, shutters and bell opening. Two additional
Marcio Filho / MTur Destinos aerials, published with Flickr's Public Domain
Mark, establish the village setting and support the pale rear volume. A
CC BY-SA 4.0 INPE roof reference supplies roof-location and axis evidence.
Its retained native 240×240 extract, original-raster hash, affine transform,
coordinate conversion and crop rectangle are recorded beside the source page.
The 754 MB original satellite raster is not committed or shipped.

Canopy, image blur and registration limit the rear/roof evidence. The church
is an authored interpretation of a specific monument, with estimated dimensions
and plain obscured surfaces. It does not claim a surveyed footprint, unseen
decorative detail, a complete village reconstruction or the current paint state.
The local architectural account also corroborates the Latin-cross plan, two
sacristies and exterior bell frame; its photographs and prose are not copied.

`village.ts` authors 208 triangles: a closed nave, two lower lateral volumes,
three pitched roofs, a solid extruded curved front, an open bell frame, bell,
cross and a masonry footing. The mapped anchor is latitude **-13.5825102**,
longitude **-38.9272361**. Scale .8 and the approximately south-southwest front
heading of 210° are authored interpretations. Facade, plaster, roof courses
and masonry are painted through code into previously unused atlas regions.
No new aerial or satellite pixels enter the texture.

The church and expanded combined atlas are distributed under CC BY-SA 4.0;
the original palm reconstruction remains CC BY-SA 3.0. Source creators and
licence links appear in the Brazilian Portuguese editorial and itinerary
credit. Full legal codes and rights pages are retained. Authoring used Bun,
Three.js and Sharp; no image/model generation service was used.

## Matched production-camera captures

Both sets use the final combined runtime. The before set routes the retained
approved GLBs/WebPs, including the pre-church Feature library. Camera, viewport,
tier and DPR remain identical across each pair. Desktop is 1280×800 and phone
emulation 390×844, device DPR 1; Balanced render DPR .9, Low render DPR 1.
The existing harness asserts active 3D, tier and DPR through readback.
Synthetic GPU classification distinguishes full Balanced from the modest-GPU
colour-only path; adaptive safeguards remain enabled. These art settings are
not used in the physical-GPU sailing benchmark.

Close framing retains 48° pitch, north bearing, half aerial distance and target
height .7. Only Close View captures hide the Stop Card with opacity, leaving its
ordinary measurements intact. #72 still owns the Close View user interaction.
[Per-capture settings](issue69/village/capture-settings.json) and diagnostics
beside each image record the comparison.

| Treatment | Aerial before / after | Close before / after |
| --- | --- | --- |
| Desktop Balanced | [Before](issue69/village/before/desktop-balanced-aerial.png) / [After](issue69/village/after/desktop-balanced-aerial.png) | [Before](issue69/village/before/desktop-balanced-close.png) / [After](issue69/village/after/desktop-balanced-close.png) |
| Balanced colour-only | [Before](issue69/village/before/desktop-colour-only-aerial.png) / [After](issue69/village/after/desktop-colour-only-aerial.png) | [Before](issue69/village/before/desktop-colour-only-close.png) / [After](issue69/village/after/desktop-colour-only-close.png) |
| Desktop Low | [Before](issue69/village/before/desktop-low-aerial.png) / [After](issue69/village/after/desktop-low-aerial.png) | [Before](issue69/village/before/desktop-low-close.png) / [After](issue69/village/after/desktop-low-close.png) |
| Phone Low emulation | [Before](issue69/village/before/phone-low-aerial.png) / [After](issue69/village/after/phone-low-aerial.png) | [Before](issue69/village/before/phone-low-close.png) / [After](issue69/village/after/phone-low-close.png) |
| Missing terrain textures | [Before](issue69/village/before/desktop-fallback-aerial.png) / [After](issue69/village/after/desktop-fallback-aerial.png) | [Before](issue69/village/before/desktop-fallback-close.png) / [After](issue69/village/after/desktop-fallback-close.png) |

Required Boipeba resting views: [desktop Balanced](issue69/village/asset-art/desktop-balanced-stop-02.png),
[desktop Low](issue69/village/asset-art/desktop-low-stop-02.png),
[phone Low emulation](issue69/village/asset-art/phone-low-stop-02.png).
The complete 12-image `asset-art` set includes all four islands.

Agent inspection finds the church's terracotta roof and white volumes visible
at aerial distance, with the blue facade, bell frame, cross and building depth
readable in the configured Close View. The model meets the ground at its footing;
the captures show no exposed terrain underside or new shoreline seam. The
existing terrain treatment remains readable without normals and with missing
maps. Low intentionally loads no Feature meshes. This inspection does not
replace human approval of the new model.

## Resource and scene measurements

| Boipeba resource | Combined candidate | Limit |
| --- | ---: | ---: |
| Balanced terrain triangles, including skirt/shallows | 12,336 | 15,000 |
| Balanced terrain mesh bytes | 223,892 | 256,000 |
| Low terrain triangles, including skirt/shallows | 1,214 | 1,300 |
| Low terrain mesh bytes | 27,696 | 28,672 |
| Balanced colour + normal bytes | 137,354 | 153,600 |
| Low colour bytes | 13,412 | 153,600 |
| Feature instances (12 palms + church) | 13 | 160 |
| Expanded Feature triangles | 2,992 | 3,000 |
| Shared Feature GLB bytes | 159,088 | 204,800 |

The shared GLB grows by 76,428 bytes from 82,660. It retains one opaque material
and one embedded 1024px JPEG atlas, with no additional runtime texture request
or draw. Feature and terrain budgets, adaptive quality and preparation/retention
safeguards are unchanged.

The [production request/scene report](issue69/village/production-budget-report.json)
retains actual requests, hashes and diagnostics. Its software-rendered timing
does not establish physical-device performance. Complete-visit bytes reflect
the requests observed by the suite and can vary with optional preparation timing.

| Production measurement | Combined candidate | Limit |
| --- | ---: | ---: |
| Route JavaScript bytes | 197,464 | 204,800 |
| Lazy Three.js JavaScript bytes | 263,901 | 358,400 |
| Minimum-sailable transfer bytes | 2,052,840 | 2,097,152 |
| Complete-visit transfer bytes | 3,011,236 | 5,242,880 |
| Essential visual bytes | 1,093,588 | 1,310,720 |
| Observed authored visual bytes | 1,654,970 | 1.8 MiB |
| Balanced triangles / draws / render targets | 48,114 / 5 / 2 | 149,999 / 99 / 2 |
| Phone Low minimum-sailable transfer bytes | 975,288 | 2,097,152 |
| Phone Low triangles / draws / render targets | 8,222 / 2 / 0 | 149,999 / 99 / 2 |

## Verification

- `bun test`: 249 passed, 0 failed; 134,834 assertions. The new geometry test
  checks closed volumes, valid UVs, nondegenerate faces, roof/front/rear normals,
  complete depth and a below-ground footing.
- `bun run lint`, `bun run typecheck`, `bun run build`: passed.
- `bun run assets:audit`: all 106 provenance records passed.
- Two final `bun run landmarks:build` executions: byte-identical.
- Production browser suite: 27 passed (10 terrain captures, 12 `asset-art`
  captures, 3 optional-loading checks, 2 production checks).
- Matched before art suite: 10 passed.
- Ordinary card placement: all five viewports passed across Stops 00–04,
  using the original run and two fresh-browser reruns recorded below.
- Isolated same-hardware before/after sailing: both passed; the final combined
  candidate passed on its first benchmark run.

Logs are retained under [the village evidence directory](issue69/village/logs).
Ordinary card placement and isolated same-hardware performance results are
recorded separately below.

## Ordinary card placement

The first production placement run passed landscape phone, portrait and narrow
portrait cases across all five Stops. Desktop reached Stops 00–03 and then
timed out awaiting Stop 04 while the software-rendered harness promoted quality
to High. No card overlap assertion failed. Small landscape failed while creating
the browser context, before application execution:
`Browser.setDownloadBehavior: Failed to find browser context`.
The [original log](issue69/village/logs/card-placement.txt) and
[desktop trace](issue69/village/failed-cards/desktop-trace.zip) /
[small-landscape trace](issue69/village/failed-cards/small-landscape-trace.zip)
are retained. Both cases passed in separate fresh browsers without application
changes: [desktop rerun](issue69/village/logs/card-desktop-fresh.txt) and
[small-landscape rerun](issue69/village/logs/card-small-landscape-fresh.txt).
The desktop failure did not repeat; a definitive root cause was not established.
The original failure is retained rather than claimed as a fixed application bug.

The [temporary production configuration](issue69/village/card-placement-config.txt)
uses the existing journey fixture and card/Ship/Landmark/chrome overlap
assertions. Viewports are 1440×900, 844×390, 568×320, 390×844 and 320×568,
separate from the Close View art harness.

## Physical-GPU sailing comparison

Before evidence uses the actual pre-village production build identified above,
not an asset-swapped runtime. It ran before public assets were regenerated.
Authoring source files while that server remained on the old build makes its
generic source-fingerprint check stale; the exported runtime build identity and
retained before hashes establish which candidate actually ran. No builds,
other browser captures or asset generation overlapped the sailing measurement.

The final comparison uses the same AMD Radeon RX Vega 10 / Ryzen 7 3700U host,
Chrome 154.0.8037.93, 1522×632 viewport and device DPR 1.25, starting Balanced
at render DPR .9. Each run follows the existing representative route for at
least five active minutes with adaptive quality enabled. Every complete scored
window, GPU p90, tier/DPR change and error is retained in its diagnostic export.
The final candidate runs separately from builds and other captures.

[Before diagnostics](issue69/village/before-performance/ocean-voyage.json),
[after diagnostics](issue69/village/after-performance/ocean-voyage.json) and
the [comparison summary](issue69/village/performance-summary.json) retain the
two runs. Both started at render DPR .9 and adaptively used .9 and 1 while
remaining Balanced. Every scored Chrome frame-interval window satisfies
p90 ≤20 ms, including the passage windows. Recorded GPU timing varies between
runs; these observations do not establish a causal cost for the church alone.

| Measurement | Approved terrain/palms | Combined village candidate |
| --- | ---: | ---: |
| Active measured seconds | 323.05 | 324.36 |
| Complete scored windows | 159 | 160 |
| Worst window frame-interval p90 | 17.20 ms | 18.70 ms |
| Windows above 20 ms | 0 | 0 |
| Worst window GPU p90 | 8.62 ms | 15.00 ms |
| Tier changes | 0 | 0 |
| Observed render DPR values | .9, 1 | .9, 1 |
| Scene triangles / draws / render targets | 61,967 / 9 / 2 | 62,175 / 9 / 2 |
| Renderer or page errors | 0 | 0 |

The [after invocation log](issue69/village/logs/after-performance.txt) records
the final pass. Both use `bunx playwright test --config playwright.production.config.ts
--project ocean-voyage-chrome`, with separate output directories. Both are local
headless Chrome runs on the physical GPU with the
display kept awake; they are not physical-phone validation or clean-candidate
rollout sign-off. The raw exports retain every scored window and quality event.
