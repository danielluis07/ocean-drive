# Ilha Grande rework — issue #71

This implementation is based on
`dd071b39181c4833f3818a3953f6d76347eb6cff`. Final build:
`dd071b39181c4833f3818a3953f6d76347eb6cff-88f06287423a1c3f`.
The owner explicitly approved the final visuals on 2026-10-05. Physical-phone
validation remains pending. This report does not close the issue or establish
completed rollout.

## Baseline and retained work

The starting checkout had the completed Noronha, Boipeba and Abrolhos terrain,
the reconstructed Boipeba palms/church and Abrolhos lighthouse, and legacy Ilha
Grande terrain with no Features. [Baseline hashes](issue71/baseline-assets.json)
identify all 23 shipped model/map files. [Candidate hashes](issue71/candidate-assets.json)
record the final bytes, measured model contract and placement comparison.

All 15 terrain/map assets belonging to the other three islands remain
byte-identical, as do both Ship variants. The completed Feature models retain
their order, attributes, topology, UVs and placement arrays. The combined source
PNG retains every pixel outside the newly allocated tiles. The intentional
shared change is a JPEG re-encoding at quality 78 / 4:2:0, plus appended models
and Ilha Grande placements. All-island ordinary art regression is retained.

## Natural surface and named places

Ilha Grande uses the native 1024px Balanced colour/normal and independent 512px
Low colour baker. Overlapping canopy signals cover ordinary coastal hills;
granite emerges on steep ridges, with mapped pale sand at Lopes Mendes, Abraão,
Dois Rios and Aventureiro. Beach paths use the same geographic projection as the
terrain. Palette, display widths, forest coverage and shallows are authored
interpretations, separately documented from the unchanged coastline/SRTM data.
Bounded relief is at most ±0.08 world units. Scalar accessibility is applied
once in linear colour; missing maps retain the independent vertex-colour bake.

The 0.08-unit shoreline transition avoids submerging the compressed Abraão
sites. The shallows waterline follows that ratio, with the submerged skirt
preserved. Balanced sampling remains concentrated on coastline and steep ground;
the 0.80 sampling ratio leaves room in the existing initial-transfer budget.
Loading, settled-only preparation, two-island map retention and adaptive-quality
safeguards remain intact. Low loads no Feature library or normal maps. A few
mapped landward support samples keep Lopes Mendes above the swell in Low:
the ordinary coarse interior grid otherwise submerged its already-baked sand.
The support samples preserve the recorded height function and submerged coast,
and count against Low's original limits.

The starting Feature list is interpreted as:

| Place | Retained mapped anchor | Reconstruction |
| --- | --- | --- |
| Vila do Abraão | Church node 992696336: -44.1684089, -23.140259 | Igreja de São Sebastião: closed nave, gables, tiled roof, belfry, cap, openings, cross and footing |
| Abraão tourist pier | Landward vertex of way 285033162: -44.1680091, -23.1399026 | Straight plank deck, sides, underside, beams, pilings and bollards |
| Pico do Papagaio | Node 510142564: -44.1968058, -23.1550619 | Full granite summit with projecting beak, cleft, rounded crown, sloping back and buried base |
| Lopes Mendes | Beach way 26161374 and node 3250252561 | Long sandy strip integrated into full terrain geometry and both texture tiers |

Vila do Abraão uses its real church and pier; no invented village houses or boats
are added. Lopes Mendes stays visible on Low as terrain rather than a separate
floating Feature. The owner approved this interpretation with the final visuals.
Fifteen volumetric broadleaf crowns supplement the terrain treatment; their
scatter interprets forest rather than a measured tree census.

The pier's seat is at least 0.44 units. Its deck clears the ±0.395-unit swell;
pilings extend below its trough. Both build and runtime convert packed integer
positions to floating point before applying node transforms, preventing CPU
decode from truncating the new models. Regression tests check actual packed
geometry, sides, footings, normals and atlas coordinates.

[Source files, reference/rights records and transformations](../../data/landmarks/features/ilha-grande/README.md)
include retained photographs and pages by Fulviusbsas, LíviaBuhring, Vihgaby,
José Carlos B Fialho, MBelu and Glauco Umbelino, OSM queries/coordinates, texture
crop coordinates and UV/storage transformations. The models are project-authored
reconstructions made offline with TypeScript, Three.js and Sharp. No image/model
generation service was used. New adaptations and the combined atlas are CC BY-SA
4.0; original palm rights remain CC BY-SA 3.0. Attribution appears in the app in
Brazilian Portuguese. See [terrain provenance](../third-party/ilha-grande-terrain.md).

## Budgets and reproducibility

| Ilha Grande resource | Actual | Limit |
| --- | ---: | ---: |
| Balanced terrain + skirt + shallows triangles | 11,518 | 15,000 |
| Balanced terrain GLB | 209,800 B | 256,000 B |
| Low terrain + skirt + shallows triangles | 1,218 | 1,300 |
| Low terrain GLB | 27,712 B | 28,672 B |
| Balanced colour + normal | 63,212 B | 153,600 B |
| Low colour | 9,382 B | 512px colour only |
| Balanced Feature instances | 18 | 160 |
| Expanded Feature triangles | 1,405 | 3,000 |
| Balanced / Low island draws | 3 / 2 | 3 / 2 |
| Shared Feature GLB | 201,060 B | 204,800 B |
| Shared atlas | One opaque 1024px JPEG | One 1024px atlas |
| All shipped model/map files, conservative sum | 1,836,348 B | 1,887,436.8 B |

The shared file contains seven unique models, 2,597 stored triangles and 32
placements across all islands. Its per-island expansion uses one draw. No
external glTF resources, animation or skinning are introduced. Executable limits
in `content/landmark-sources.ts` and `lib/production-budgets.ts` are unchanged.

Two complete `bun run landmarks:build` executions reproduced all 30 generated
files, including the terrain/maps, source libraries/atlases and build record:
[hash comparison](issue71/reproducibility.json),
[first log](issue71/logs/final-offline-build-1.txt),
[second log](issue71/logs/final-offline-build-2.txt).
The build reads only retained local inputs. `assets:record` pins 152 provenance
records; `assets:audit` passes. Production payload/scene measurements are recorded
in the [browser report](issue71/production/production-budget-report.json).

| Production measurement | Actual | Limit |
| --- | ---: | ---: |
| Route JavaScript, gzip | 198,004 B | 204,800 B |
| Lazy 3D JavaScript, gzip | 264,026 B | 358,400 B |
| Minimum-sailable transfer | 2,086,488 B | 2,097,152 B |
| Complete measured visit | 2,834,148 B | 5,242,880 B |
| Minimum essential visuals | 1,084,152 B | 1,310,720 B |
| Requested authored visuals | 1,633,120 B | 1,887,436.8 B |
| Fonts | 34,952 B | 163,840 B |
| Recorded Balanced draws / triangles / targets | 5 / 48,114 / 2 | 99 / 149,999 / 2 |

The request report measures this scripted visit, not every optional file at
once. The conservative all-file sum above includes both Ship/terrain LODs,
every map and the shared Feature library. Sailing scene measurements are retained
separately with the sustained device capture.

## Visual review

[Interactive comparison gallery](issue71/review.html) provides before/after and
terrain-only views. The camera configuration is 48° pitch, half aerial distance,
270° bearing and target height 1.2, looking west from the eastern shore. The long
axis recedes into the phone frame. The horizon stays out of frame. Close View is
an inspection of a portion of the island; the aerial capture retains the full
shoreline silhouette. The desktop close frame crops the nearest eastern tip.
Issue #72 still owns the interaction.

The five matched modes use device DPR 1:

| Mode | Viewport | Active tier | Render DPR | Optional maps |
| --- | --- | --- | --- | --- |
| Desktop Balanced | 1280×800 | Balanced | 0.9 | Colour + normal |
| Desktop colour-only | 1280×800 | Balanced | 0.9 | Colour only; synthetic modest-GPU identity |
| Desktop Low | 1280×800 | Low | 1 | Colour only |
| Phone Low | 390×844 | Low | 1 | Colour only |
| Missing-texture fallback | 1280×800 | Balanced | 0.9 | Map requests return 404 |

Each has aerial and Close View captures. The harness asserts active 3D, tier
and DPR before and after readback. Host-GPU captures intercept renderer identity
and timer availability for matched art settings; they are not hardware performance
measurements. The Close View hides only the Stop Card's opacity while preserving
its measured layout. Ordinary card placement is checked separately.

Natural terrain was inspected before Feature integration. The
[first native Close View sample](issue71/natural-first/capture-settings.json) exposed a shoreline
problem; the [corrected terrain-only set](issue71/natural-shore/capture-settings.json)
was reviewed before models were integrated;
[capture log](issue71/logs/natural-shore-captures.txt). Final combined, natural-only and
matched baseline sets use the final camera and are retained with diagnostics.
The final paired baseline routes the original asset bytes through the final
capture harness, so its build ID identifies the harness and its baseline field
identifies the original model/map input directory.

The owner explicitly approved the required ordinary Stop 04 `asset-art` views
and final desktop Close View on 2026-10-05, for the final build identified above:

- [Desktop Balanced](issue71/asset-art/desktop-balanced-stop-04.png)
- [Desktop Low](issue71/asset-art/desktop-low-stop-04.png)
- [Phone Low](issue71/asset-art/phone-low-stop-04.png)
- [Desktop Balanced Close View](issue71/final/desktop-balanced-close.png)
- [Phone Low Close View](issue71/final/phone-low-close.png)

Approval status: **approved by the owner**. Physical-phone visual/performance evidence:
**unvalidated**. A desktop phone viewport is not a physical phone.

## Checks and device comparison

- `bun test`: 260 passed, 0 failed; [log](issue71/logs/bun-tests.txt).
- `bun run lint`: passed; [log](issue71/logs/lint.txt). The final geometry/test
  edits also pass [focused lint](issue71/logs/final-edits-lint.txt) and
  [Low-coast lint](issue71/logs/low-beach-lint.txt); the Stop Card
  animation-wait correction passes [its lint check](issue71/logs/card-test-lint.txt).
- `bun run typecheck`: passed, including the final test correction;
  [final log](issue71/logs/typecheck-final.txt).
- `bun run build`: passed; [log](issue71/logs/final-production-build.txt).
- `bun run assets:record` and `bun run assets:audit`: passed;
  [record log](issue71/logs/assets-record.txt), [final audit log](issue71/logs/assets-audit-final.txt).
- Final production build identity, all thirty matched capture settings,
  report links and retained suite-artifact hashes pass verification;
  [identity log](issue71/logs/final-build-identity.txt),
  [evidence integrity log](issue71/logs/evidence-integrity.txt).

The final production browser run passes 15 cases: ten terrain-detail captures,
three optional-map loading/retention/fallback cases and two production
provenance/payload/context checks. [Log](issue71/logs/final-browser-checks.txt).
The three final Stop 04 ordinary art captures pass;
[log](issue71/logs/final-asset-art.txt),
[capture record](issue71/asset-art/suite.evidence.json).
Nine captures of the other three islands remain as shared-atlas regression;
[record](issue71/asset-art-regression/suite.evidence.json). Their Feature-library
bytes and the other islands' asset bytes are identical to the final revision.
The original suite passed twelve cases; its three superseded Ilha Grande
images were removed because the final Stop 04 captures are retained separately.
These are focused suite results; human approval is recorded separately. All ten
matched baseline captures and all ten final terrain-only captures pass, with
matching viewport, tier, DPR and final-build identity:
[baseline log](issue71/logs/before-matched-captures.txt),
[terrain-only log](issue71/logs/natural-final-captures.txt).
The separate Stop Card placement check passes all five CSS viewports
(1440×900, 844×390, 568×320, 390×844 and 320×568), at device DPR 1 on the host
GPU. It visits every Stop and checks containment, Ship/Landmark/chrome clearance
and beside/below placement. This layout check uses the existing synthetic clock;
the sustained sailing test uses real time. [Log](issue71/logs/card-placement-final.txt),
[suite record](issue71/card-placement/suite.evidence.json),
[configuration](issue71/card-placement-config.txt).
The unchanged final candidate passes the full-route sailing rerun described below.

The isolated baseline sailed for 322.996 active seconds on AMD Radeon RX Vega
10 / Ryzen 7 3700U, Windows, Chrome 154.0.8037.93, viewport 1522×632, device DPR
1.25, starting Balanced at render DPR 0.9. All 159 scored windows had frame p90
≤20 ms: worst 16.9 ms; worst GPU p90 8.9656 ms; no tier changes. Its exact
build ID and every scored window are retained in
[baseline performance](issue71/before-performance.json).
[Baseline run log](issue71/logs/before-performance.txt).
The unchanged final candidate's rerun passes on the same host/settings. Historical
Noronha or Abrolhos measurements are not substituted for this candidate.

| Full-route run | Active seconds | Scored windows | Worst frame p90 | Worst GPU p90 | Windows over 20 ms | Tier changes |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Original baseline | 322.996 | 159 | 16.9 ms | 8.9656 ms | 0 | 0 |
| First candidate run, failed | 323.295 | 159 | 26.6 ms | 9.02176 ms | 5 | 0 |
| Unchanged candidate rerun, passed | 323.445 | 159 | 18.0 ms | 8.79952 ms | 0 | 0 |

[Final complete diagnostics](issue71/after-performance.json),
[passing suite record](issue71/sailing-after/suite.evidence.json),
[rerun log](issue71/logs/after-performance-rerun.txt),
[comparison data](issue71/performance-comparison.json).
Each full run includes 30 wake-active and 129 settled scored windows, with
Balanced render DPR varying between 0.9 and 1 under the production controller.
Each records maximum scene counts of nine draws, 62,175 triangles, one ocean
draw and two targets; no renderer/page errors, at most two retained map sets,
and no map decode/upload starting during a passage. The final frame-p90 maximum
is 1.1 ms above the passing baseline and remains below the unchanged 20 ms limit.
These measurements establish a passing rerun, not a guarantee against the
cadence variation observed in the retained failures.

The first final-candidate sailing run failed: 323.295 active seconds, 159 scored
windows, five over 20 ms, worst frame p90 26.6 ms, worst GPU p90 9.02176 ms and no
tier changes. All five slow windows were at settled Ilha Grande, at render DPR
0.9 and after texture preparation. Their GPU p90 was 4.33104–6.29072 ms.
[Full failed diagnostics](issue71/after-performance-failed-1.json),
[failed suite record](issue71/sailing-after-failed-1/suite.evidence.json),
[log](issue71/logs/after-performance-failed-1.txt).

A sequential 60-second settled-Arrival probe served the original and candidate
assets through the same final runtime at 1522×632/device DPR 1.25. Both failed at
render DPR 0.9: original worst frame/GPU p90 29.6/10.76304 ms; candidate
49.5/10.7296 ms, with 29 scored windows each. This is diagnostic evidence, not
five-minute acceptance. It shows the misses also occur with the old assets;
it does not prove their cause or exclude a candidate-specific contribution.
[Probe log](issue71/logs/performance-probe.txt),
[diagnostics](issue71/performance-probe/suite.evidence.json),
[test](issue71/performance-probe-test.txt),
[configuration](issue71/performance-probe-config.txt).
The final full-route rerun passes with the same build/asset bytes and no
quality-controller or test-threshold changes.

## Retained failures and revisions

- Early final-Stop capture restoration incorrectly marked the Arrival incomplete,
  returned to Departure and failed the active-3D assertion. The harness now derives
  completion from route progress. [Failed artifacts](issue71/before-failed/desktop-balanced-error.md)
  and [failed log](issue71/logs/before-captures.txt), followed by the
  [rerun log](issue71/logs/before-captures-rerun.txt), are retained.
- The first dense canopy normal bake exceeded the 150 KiB pair allowance;
  another iteration exceeded the all-visuals allowance. Frequency and bounded
  normal amplitude were reduced, with limits unchanged. See
  [first failure](issue71/logs/natural-build.txt) and
  [second failure](issue71/logs/natural-build-rerun.txt).
- Packed-position decoding initially truncated models. The actual library
  geometry test caught it; the shared floating-point transform fixes both build
  and runtime. [Failing test log](issue71/logs/focused-tests.txt),
  [corrected regression log](issue71/logs/packed-geometry-tests.txt).
- The [first combined Close View sample](issue71/combined-review/capture-settings.json)
  exposed atlas edge bleeding. New UVs now sample inside their allocated tiles;
  completed UVs and occupied PNG pixels remain intact.
- The oversampled candidate transferred **2,105,477 B** at entry, exceeding
  2,097,152 B. The retained [failed production measurement](issue71/initial-budget-failure.json)
  motivated the 0.80 Balanced sampling ratio. [Failure log](issue71/logs/uv-corrected-checks.txt).
  The final payload must pass the original cap.
- The earlier Low coast submerged Lopes Mendes despite the sand being present
  in its colour map. The [regression before the fix](issue71/logs/low-beach-regression-before.txt)
  found zero above-swell near-shore sand vertices; the
  [corrected shipped-mesh regression](issue71/logs/low-beach-regression-after.txt)
  passes. Mapped landward support samples restore the strip, with no new
  elevation/shoreline data and no budget increase. The original all-island
  other-island captures remain in `issue71/asset-art-regression/`; its shared
  Feature bytes and the other islands' geometry/maps are unchanged by this correction.
- The software-rendered Stop Card run failed during scene/navigation changes,
  before reporting any geometry overlap. On the host GPU, the portrait check
  exposed an `AbortError` from an entry animation replaced by a state change.
  The check now polls the current animations until settled, preserving all
  viewport/Ship/Landmark/chrome assertions. Both failed runs and error contexts are
  retained: [software run](issue71/card-placement-failed/suite.evidence.json),
  [software failure log](issue71/logs/card-placement.txt),
  [GPU reproduction](issue71/card-placement-gpu-failed/suite.evidence.json),
  [GPU failure log](issue71/logs/card-placement-gpu-repro.txt).

## Retained evidence after cleanup

The final before/after and terrain-only sets, approved ordinary art, shared-atlas
regression, full performance diagnostics (including failures), offline hashes,
test results and all licensed source inputs remain retained. Superseded image
sets, redundant sailing screenshots, duplicate diagnostic JSON, bulky Playwright
trace archives and issue-specific scratch directories were removed. Suite records
retain their original outcomes, candidate identity and hashes for retained artifacts,
with notes describing trimmed attachments. Historical `.tmp` command paths identify
the original runs; the diagnostic method/configuration copies remain as text records.

Human art approval is recorded. Acceptance remains open for required physical-device
evidence. The implementation, source records and focused automated evidence do not
imply clean-candidate release sign-off or completed rollout.
