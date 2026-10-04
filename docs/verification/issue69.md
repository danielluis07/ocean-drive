# Issue #69 — Boipeba terrain and palm candidate

## Status

The owner approved the terrain-and-palms visuals on **2026-10-04** in the
implementation request that follows the issue comment. That approval covers
the retained candidate below, before the village addition.
The terrain, coconut palms, Moreré shallows and configured Close View are
implemented. The original village reference blocker is recorded below as
historical context. A subsequent church reconstruction and its additional
licensed references, captures and validation are recorded in
[village verification](issue69-village.md). Physical-phone evidence remains a
rollout gap. The original blocker and pre-approval validation status were also
[recorded on issue #69](https://github.com/danielluis07/ocean-drive/issues/69#issuecomment-5982666668).

**Physical-phone validation is unvalidated.** The owner explicitly confirmed
that no phone is available. Phone-sized desktop captures below are visual
emulation, not physical-device performance evidence.

## Identity and implementation

- Baseline: `5844ec1da79fb118c373e84285b627a5e4b3e8a4`.
- Final production build: `5844ec1da79fb118c373e84285b627a5e4b3e8a4-2b492672087bdbf1`.
- [Baseline hashes](issue69/baseline-assets.json) and
  [reproduced candidate hashes](issue69/candidate-assets.json).
- Two final offline builds reproduced all 23 retained generated files: the
  21 public Landmark meshes/maps, source Feature library and editable atlas.
  All 15 terrain files belonging to the other three islands are byte-identical.
- Native 1024px colour/normal and independent 512px colour-only Boipeba maps,
  with low western mangrove interpretation, lighter restinga and long pale
  ocean-facing beaches. Scalar mesh occlusion remains baked into colour once.
- Relief is 1.05 world units above the existing lowland clearance. Authored
  surface relief is bounded to ±0.025 units; neither is newly surveyed geography.
- Moreré's pale reef-pool signal uses the existing water mesh and draw at the
  retained OSM coordinate. It is artistic interpretation, not bathymetry.
- A 1.6-grid-step landward shallows overlap closes the small Low water-band
  gaps visible in the baseline. Other islands retain their existing overlap.
- Twelve textured coconut palms, 232 triangles each, follow deterministic
  terrain rules and the eastern coastal habitat envelope. Full trunk and
  footing, curved crowns and separately silhouetted leaflets are reconstructed
  from Panta LH's licensed photograph. The shared opaque 1024px atlas includes
  a photographic bark crop and authored leaf texture. Low loads no Features.
- The Abrolhos placeholder's geometry, colours and placement are preserved;
  it samples a white atlas region. No lost Noronha Feature was reconstructed.
- CC BY-SA 3.0 credit appears in the editorial presentation and itinerary.

The [terrain provenance](../third-party/boipeba-terrain.md) and
[reconstruction record](../../data/landmarks/features/boipeba/README.md)
retain original photographs, rights pages, licences, geographic records,
texture crop/UV transformations, editable sources and the offline build.
No model-generation or image-generation service was used.

## Original village reference blocker (superseded by the village addition)

The retained CC BY-SA photograph of Igreja do Divino Espírito Santo establishes
its blue front, pediment and openings but not the required roof, sides and rear.
The second inspected church-festival photograph shows a procession rather than
the building volume. The direct OSM API extract supplies the church point
(-13.5825102, -38.9272361), but no footprint; Wikidata corroborates the location.
Overpass attempts failed with HTTP 406 and a timeout, so the direct API was used.
The retained village-shore image also does not establish complete building
volumes. Adequate licensed oblique/back/roof references or an accurate licensed
model remain necessary. The blocker is about evidence, not generation credits
or requiring the owner to supply a model.

## Matched visual review

Desktop viewport is 1280×800; phone viewport is 390×844. Device DPR is 1.
Balanced captures start from a remembered render DPR of .9; Low uses 1.
The harness asserts the tier, render DPR and active 3D before and after capture.
It emulates a generic GPU without timer queries for full/fallback Balanced,
and Intel UHD 620 classification for colour-only Balanced. The normal-map
request assertions distinguish the two. Adaptive safeguards remain active.
These synthetic art settings never enter the physical-GPU benchmark.

Before captures route the retained baseline GLBs/WebPs, including the original
Feature library. Both sides use the same production camera and reduced-motion
ocean. Close View is configured at 48° pitch, north bearing, half the aerial
distance and target height .7. The capture hides the Stop Card with opacity,
preserving ordinary layout measurements. #72 still owns the user interaction.
The asset-swapped before set uses preview runtime build suffix `55e3747d1bd6b344`;
the final candidate uses `2b492672087bdbf1`. The intervening asset-generation
change closes the shallows overlap; the camera configuration is identical.
[Per-capture settings and final quality](issue69/capture-settings.json) and
the diagnostics beside each image document the comparison.

| Treatment | Aerial before / after | Close before / after |
| --- | --- | --- |
| Desktop Balanced | [Before](issue69/before/desktop-balanced-aerial.png) / [After](issue69/after/desktop-balanced-aerial.png) | [Before](issue69/before/desktop-balanced-close.png) / [After](issue69/after/desktop-balanced-close.png) |
| Balanced colour-only | [Before](issue69/before/desktop-colour-only-aerial.png) / [After](issue69/after/desktop-colour-only-aerial.png) | [Before](issue69/before/desktop-colour-only-close.png) / [After](issue69/after/desktop-colour-only-close.png) |
| Desktop Low | [Before](issue69/before/desktop-low-aerial.png) / [After](issue69/after/desktop-low-aerial.png) | [Before](issue69/before/desktop-low-close.png) / [After](issue69/after/desktop-low-close.png) |
| Phone Low | [Before](issue69/before/phone-low-aerial.png) / [After](issue69/after/phone-low-aerial.png) | [Before](issue69/before/phone-low-close.png) / [After](issue69/after/phone-low-close.png) |
| Missing textures | [Before](issue69/before/desktop-fallback-aerial.png) / [After](issue69/after/desktop-fallback-aerial.png) | [Before](issue69/before/desktop-fallback-close.png) / [After](issue69/after/desktop-fallback-close.png) |

The owner approved these terrain-and-palms visuals on 2026-10-04. That approval
does not establish artistic acceptance of the subsequent village addition.

Required Boipeba resting views: [desktop Balanced](issue69/asset-art/desktop-balanced-stop-02.png),
[desktop Low](issue69/asset-art/desktop-low-stop-02.png), and
[phone Low emulation](issue69/asset-art/phone-low-stop-02.png).

Agent inspection of all ten final views found the long beaches and dark/light
vegetation readable at aerial distance, including Low without Features or
normals. The close views show complete palm crowns, trunks and footings;
the land's skirt is not exposed. Low retains an intentionally coarser outline.
The small water-band gaps visible in the baseline are covered in the final
candidate. This inspection does not replace owner approval.

## Asset measurements

| Boipeba resource | Candidate | Limit |
| --- | ---: | ---: |
| Balanced terrain triangles, including skirt/shallows | 12,336 | 15,000 |
| Balanced mesh bytes | 223,892 | 256,000 |
| Low terrain triangles, including skirt/shallows | 1,214 | 1,300 |
| Low mesh bytes | 27,696 | 28,672 |
| Balanced colour + normal bytes | 137,354 | 153,600 |
| Low colour bytes | 13,412 | 153,600 |
| Palm instances | 12 | 160 |
| Expanded palm triangles | 2,784 | 3,000 |
| Shared Feature GLB bytes | 82,660 | 204,800 |

No executable budget, adaptive-quality rule or optional-loading safeguard was
relaxed. The Low mesh has 976 bytes of remaining payload allowance.

The [production request and scene report](issue69/production-budget-report.json)
retains every request, hash and diagnostic from the final build. These are the
existing suite's measured transfer/scene values; software-rendered timing in
that report is not physical-device performance evidence.

| Production measurement | Candidate | Limit |
| --- | ---: | ---: |
| Route JavaScript bytes | 197,156 | 204,800 |
| Lazy Three.js JavaScript bytes | 263,901 | 358,400 |
| Minimum-sailable transfer bytes | 1,975,777 | 2,097,152 |
| Complete-visit transfer bytes | 3,557,407 | 5,242,880 |
| Essential visual bytes | 1,093,588 | 1,310,720 |
| Observed authored visual bytes | 1,578,542 | 1.8 MiB |
| Balanced scene triangles / draws / render targets | 47,906 / 5 / 2 | 149,999 / 99 / 2 |
| Phone Low minimum-sailable transfer bytes | 974,653 | 2,097,152 |
| Phone Low scene triangles / draws / render targets | 8,222 / 2 / 0 | 149,999 / 99 / 2 |

## Verification

- `bun test`: 248 passed, 0 failed; 132,122 assertions.
- `bun run lint`, `bun run typecheck`, `bun run build`: passed.
- `bun run assets:audit`: 97 provenance records passed.
- Two final `bun run landmarks:build` executions: byte-identical.
- Final production browser run: 27 passed (10 terrain captures, 12 `asset-art`
  captures across all four islands, 3 optional-texture checks, 2 production checks).
- Baseline matched art run: all 10 passed. All pairs retain identical camera,
  viewport, tier and DPR; none fell back out of 3D.
- Card placement passed at 1440×900, 844×390, 568×320, 390×844 and 320×568,
  across all five Stops, separately from the Close View art harness.
- The isolated physical-GPU sailing run passed on its first final-candidate run.

The first separate card-placement run passed desktop, small landscape,
portrait and narrow portrait checks across all five Stops. The 844×390 test
failed while Playwright was creating its browser context, before any page or
application assertion: `Browser.setDownloadBehavior` could not find the new
context after its 30-second setup timeout. The [original log](issue69/logs/card-placement-first.txt)
and [trace](issue69/failed-card-run/trace.zip) are retained; that viewport is
rerun in a fresh browser, without application changes, and
[passed](issue69/logs/card-placement-rerun.txt). The temporary production
[configuration](issue69/card-placement-config.txt) and logs retain the method.

An [earlier art-harness failure](issue69/failed-art-run/README.md) is retained
with diagnostics: automatic warm-up promoted the fallback capture to High.
The final harness uses the documented synthetic art settings and asserts
identical DPR through readback. Production quality controls were not changed.

## Physical-GPU comparison

The retained [baseline sailing run](issue69/before-performance.json) and
[final candidate run](issue69/after-performance.json) use
AMD Radeon RX Vega 10 / Ryzen 7 3700U, Chrome 154.0.8037.93,
1522×632 viewport, device DPR 1.25 and the existing five-active-minute route.
Both began at Balanced / render DPR .9 with adaptive quality enabled. The
candidate ran separately from builds, other captures and artifact retention.
Every scored window meets p90 ≤20 ms.

| Measurement | Baseline | Final candidate |
| --- | ---: | ---: |
| Active measured seconds | 323.08 | 323.60 |
| Complete scored windows | 159 | 160 |
| Worst window frame-interval p90 | 17.10 ms | 19.70 ms |
| Windows above 20 ms | 0 | 0 |
| Worst window GPU p90 | 9.12 ms | 8.92 ms |
| Tier changes | 0 | 0 |
| Observed render DPR values | .9 | .9, 1 |
| Recorded quality events | 20 | 26 |
| Peak scene triangles / draws / render targets | 58,347 / 8 / 2 | 61,967 / 9 / 2 |

The complete JSON reports retain every scored-window p90, GPU p90, quality
state, quality event and scene measurement. A [derived summary](issue69/performance-summary.json)
is retained alongside them. This is a passing local desktop result, with
0.30 ms margin in the worst observed frame-interval window. It does not establish
performance on other hardware or clean-release sign-off for this uncommitted tree.
Physical-phone results remain unvalidated regardless of the desktop result.

## Repeating the checks

```powershell
bun run landmarks:build
bun run assets:record
bun run assets:audit
bun test
bun run lint
bun run typecheck
bun run build
$env:TERRAIN_ISLAND='boipeba'
bunx playwright test --config playwright.production.config.ts --project terrain-detail --project asset-art --project production --project landmark-textures
# Run separately, with no other captures or builds:
bunx playwright test --config playwright.production.config.ts --project ocean-voyage-chrome
```

For before captures, additionally set `TERRAIN_BASELINE` to a directory holding
the baseline `models/` and `textures/`; unset it for candidate captures.
