# Island Landmarks

Implements [#39](https://github.com/danielluis07/ocean-drive/issues/39). Each of
Stops 01–04 is identified by the island it really is: Fernando de Noronha,
Ilha de Boipeba, the Arquipélago de Abrolhos and Ilha Grande. The Landmarks
carry no label, marker or light; the shape of the land is the identification.

One pipeline builds all four, and adding a fifth island is a config entry.
[#67](https://github.com/danielluis07/ocean-drive/issues/67) enlarged the
islands, turned the surf band into a shallows band, and added the mechanism that
places vegetation and named Features on them.

## The pipeline

```text
content/landmark-sources.ts   what to build, how big, how it is shaded
        │  bun run landmarks:fetch          (network; maintenance only)
        ▼
data/landmarks/<id>.json      recorded coastline rings + elevation grid
        │  bun run landmarks:build          (offline, deterministic)
        ▼
public/models/landmark-<id>-<tier>.v1.glb   the shipped meshes
public/models/landmark-features.v1.glb      the models placed on them, once
content/landmarks.json        what the scene and CI read back
```

**`content/landmark-sources.ts`** is the only place an island is described: its
query box in degrees, the zoom and grid of its elevation samples, which
coastline rings belong to it, how many world units it spans, how high it
stands, how wide its surf line and its shallows are, the sand/rock/vegetation
palette it is shaded with, and what stands on it: the terrain rules that scatter
vegetation and the coordinates of its named Features. `landmarkBudget` in the
same file holds the triangle, transfer, draw and instance budget each quality
tier may spend on one Landmark, and `featureFile` the budget of the one file
their models ship in.

**`bun run landmarks:fetch`** is a maintenance command and the only step that
uses the network. It queries OpenStreetMap through the Overpass API for
`natural=coastline` ways, chains those directed ways on their shared end nodes
into closed island rings, drops open chains (a mainland shore leaving the box),
inner water bodies, rings too small to read and neighbours that only share the
box, then downloads the Terrain Tiles elevation covering what is left and
resamples it into one square grid of whole metres. The result is written to
`data/landmarks/<id>.json` and committed. Sources, licences, attributions and
transformations are recorded in
[`docs/third-party/open-geodata.md`](third-party/open-geodata.md) and in the
provenance ledger; the credit the ODbL requires is also shown in the experience
through `brand.dataCredit`.

**`bun run landmarks:build`** reads only those records, so it is reproducible
and needs no network. Per island and per tier it:

1. projects the rings to metres about their own centre and scales them so the
   island spans its configured world units, keeping true north up;
2. simplifies each ring to the detail the production camera can resolve;
3. walks the shoreline at an even spacing and fills the interior with a
   staggered grid, then Delaunay-triangulates the two together and drops the
   triangles whose centres fall in the water, which follows the coast and spans
   nothing between separate islands;
4. lifts each vertex by the recorded elevation, easing the land down below the
   waterline at the shore so the swell never uncovers a seam, raises compressed
   lowlands by 0.44 world units to clear the swell, and hangs a skirt
   under the shoreline so the camera's remaining perspective cannot look under
   the island;
5. shades every vertex by height, slope and distance inland — sand on low,
   flat coastal ground within the configured `beachWidth`, bare rock where it
   is steep, vegetation inland — using the Balanced surface as the shading
   source for both tiers, then bakes ambient occlusion into vertex colours;
6. builds the shallows band around the shoreline;
7. on the Balanced surface, scatters instances by terrain rules and stands each
   named Feature at its coordinates; and
8. exports `island` and `surf` as one glTF, then records what it actually wrote
   in `content/landmarks.json`.

Once every island is built it writes the shared Feature file: each model once,
and every Landmark's placements.

The sample spacing is not tuned by hand. The build estimates it from the
island's area, measures what came out, and coarsens until the Landmark fits its
tier's budget — which is why a new island needs no more than its config entry.

Terrain colour and normal textures are baked offline by
`scripts/landmark-texture-bake.ts` from recorded elevation, its gradients,
distance inland and the island's palette. Noronha opts into native-resolution
authoring: every texel evaluates sand, basalt joints and irregular scrub crowns
at 1024 px for Balanced/High colour and normals, and independently at 512 px for
Low colour. Boipeba's #69 candidate uses the same native baker with its own
low-coast mangrove/restinga masks; Abrolhos and Ilha Grande retain the legacy
enlarged 256 px field. The normal map
carries authored weathering; mesh normals carry the terrain's relief.
No satellite imagery or runtime bake is used. Rebuilding must produce identical
bytes. Projected X/Z UVs align both LODs with the same survey extent.

Vertex colours and their existing occlusion bake remain an immediate fallback
for missing textures. For the native treatment, the very same scalar Balanced
accessibility bake is rasterised into each colour map using projected triangle
barycentrics, before sRGB encoding. It is applied exactly once; no AO texture,
extra render pass or runtime multiplication is added. Once colour is prepared, the material disables vertex
colours rather than multiplying two terrain treatments. Procedural fragment
grain has been removed. Textures never participate in the entry Suspense gate.

`lib/landmark-textures.ts` retains only the current and next Landmark's maps.
Transfer may complete during sailing; decode starts only while settled, and
upload rechecks the sailing state after asynchronous decode. Late maps wait at
the next Stop. Upload is explicitly initialized before maps enter the scene.
Eviction aborts requests, disposes GPU textures and closes decoded bitmaps.
Forward/backward travel determines the next prefetch; missing detail never
blocks movement. A tier or context recovery change releases the old cache.
Modest GPUs omit the normal map while remaining on Balanced. The generator
derives sampling density from the current tier's triangle allowance, including
the surface, skirt and shallows; the former Balanced 4,400-triangle target is removed.
Low keeps a 1,200-triangle sampling target to leave transfer headroom for its shoreline.
Noronha spends more shoreline samples on the retained coastline and more
interior samples on coastal and steep ground, keeping flat interiors coarser.
A bounded authored erosion signal adds at most ±0.11 world units of new form
on existing slopes, tapering to zero at shore. This does not establish new
surveyed detail. Its source and limits are recorded in
[noronha-terrain.md](third-party/noronha-terrain.md). See [terrain-detail-assessment.md](terrain-detail-assessment.md)
for the quality direction and remaining work.

### Applying the benchmark to #69–#71

Noronha has human visual approval and passing desktop evidence. Boipeba's #69
terrain-and-palms candidate received owner visual approval on 2026-10-04;
the subsequent village church requires separate review. Physical-phone evidence remains unavailable, as
confirmed by the owner on 2026-10-03. This is not completed rollout. Abrolhos
and Ilha Grande still rebuild byte-identically through the legacy branch.
For each island candidate:

1. Configure `terrainTreatment` alongside that island's palette, `shoreHeight`
   and `beachWidth`. `relief` is the maximum peak-to-trough displacement in world
   units; `scrubScale` and `rockScale` are world-space patch frequencies. These
   values are artistic controls, not measurements. Review the shared masks
   against the island's actual character; Noronha's dry scrub and high coastal
   rock rules are not a universal vegetation/geology classification.
2. Retain any new reference, rights evidence, masks or surveyed elevation. Record
   every authored interpretation separately from geographic source data. Feature
   meshes and scatter remain with the island rework; Low must read on its own.
3. Rebuild offline twice and compare hashes, record provenance, and check all
   per-tier and complete-visit limits. Fine shoreline sampling can become
   transfer-bound before reaching 15,000 triangles; reduce selective density
   rather than raising the existing budgets without evidence.
4. Capture identical production cameras, viewport, DPR and tier: desktop
   Balanced, modest-GPU colour-only Balanced, desktop Low and phone Low, plus
   missing-texture fallback and Close View. Inspect the coastline and underside.
   `terrain-detail` targets Noronha by default; set `TERRAIN_ISLAND=boipeba`
   for Boipeba. `content/landmark-close-views.ts` configures each diagnostic
   preview's pitch, bearing, distance ratio and target height. Both currently
   use 48° pitch, north bearing and half the aerial distance, without implementing
   #72's interaction. It hides the Stop Card only for capture, outside the app.
5. Repeat the five-active-minute sailing capture on the same physical hardware;
   retain p90 frame intervals, GPU timing, tier/DPR and quality changes. The
   existing target is p90 ≤20 ms in every scored Chrome window. Phone viewport
   emulation supplies art captures, never physical-phone performance evidence.

The candidate and review status are recorded in [issue77 verification](verification/issue77.md)
and [issue69 verification](verification/issue69.md).

## Placement

`lib/ocean-config.ts` places each Landmark. The Charted Route runs west and
every island sits due north of its anchorage, so the Ship passes along the
island's southern shore instead of sailing at it, and the near top-down camera
frames the whole island above the Ship with the Stop Card clear to the side.
`content/landmarks.json` records each island's extent and the radius of the
square about its centre that holds it; the scene projects that every frame as
`--landmark-*`, which is what keeps the Stop Card off the island (the shallows
beyond it are water the card may stand over) (see
[minimal-chrome.md](minimal-chrome.md)).

Distances in Voyage Waters are deliberately compressed, and each island is
scaled on its own so that a 2 km archipelago and a 30 km island both read from
the same camera. The outlines are true; the sizes and the distances are not.

### Size

| Landmark            | Span | Before #67 |
| ------------------- | ---: | ---------: |
| Fernando de Noronha |   34 |         24 |
| Boipeba             |   27 |         19 |
| Abrolhos            |   31 |         22 |
| Ilha Grande         |   39 |         28 |

Each island is about 1.4 times its earlier size in world units. The camera that
framed the smaller islands could not hold these whole: the water north of the
Ship was about 27 world units deep on either orientation, and a portrait phone
was narrower than Ilha Grande. So `lib/route-camera.ts` was reframed with them
(see [charted-route.md](charted-route.md#camera)). On landscape the camera keeps
its height and the Ship rests lower and further left, so the islands are 1.4
times larger on screen. On portrait the camera rides higher to hold the widest
island, so the islands are about 1.13 times larger there and the Ship about a
fifth smaller; a portrait phone was already filled side to side by Ilha Grande
and has no more width to give. `height`, `beachWidth` and `surfWidth` grew with
the spans so relief, beaches and surf keep their proportions.

`tests/landmark-placement.test.ts` holds the result: every production viewport
frames each island whole with room for the Stop Card, and the Ship passes
between 3 and 12 world units off each shore.

## The shallows

Each island stands in a band of shallow water: turquoise against the land,
falling off to the ocean's navy at the band's outer edge, with the surf line
breaking along its shoreward side. The falloff is an authored treatment. No
depth data is recorded for any island, so the band says where the shore is and
nothing about the real sea floor. `shallowsWidth` sets how far it reaches on
each island and `surfWidth` how much of that the surf covers.

The build lays the band as one sheet per Landmark (`shoreBand` in
`lib/landmark-geometry.ts`): a line tucked under the land's edge, a line where
the surf ends, and a staggered grid over the water beyond, triangulated
together. Every vertex carries its true distance from the nearest shore of any
of the Landmark's islands, so the islets of an archipelago share one band
rather than laying a band each over the other's, and a narrow cove or a sliver
of rock cannot fold it. The sheet runs one grid step past the band's reach,
where it has already faded out, so its outer edge is never seen. Its UVs hold
that distance twice: `u` in surf widths and `v` in shallows widths, both zero at
the waterline. A coarser tier's land comes up through the water further inland,
so its band tucks further under it.

`lib/landmark-surf.ts` draws it. Its vertices include `oceanSwellShader` from
`lib/ocean-surface.ts` and displace by the same swell the water uses, with the
same clock and `waveStrength`. Its fragments take their depth from
`oceanSheet`, the surface the water's own triangles draw, a little above it. On
a coarse grid that surface leaves the swell by more than any fixed clearance, so
a band that only rode the swell would dip under the water's flat triangles in
places; taking the drawn surface keeps the band attached to the water at every
quality tier. It is its own mesh and its own program, so it does not depend on
the ocean's decorative shader. The complete material contract is in
[ocean-resilience.md](ocean-resilience.md#navy-daylight-and-shoreline-contract).

Foam and the mottled bed use object coordinates, which keep one scale on every
island. Narrow, broken sets of breakers roll shoreward inside the surf width.
With `prefers-reduced-motion`, the `motion` uniform drops to zero and the sets
hold still: the same band, with a static foam ring.

One material serves all four Landmarks, and the band is one mesh, so the
shoreline costs one program and one draw per island.

Boipeba additionally carries a scalar reef-pool signal in its existing shallows
mesh at Moreré's retained OSM coordinate. It blends a pale, mottled water colour
in both tiers. Other islands default the signal to zero. The extent is authored
interpretation, not measured bathymetry; see [Boipeba provenance](third-party/boipeba-terrain.md).
Its `shallowsTuck` is 1.6 terrain-grid steps, extending the water band beneath
the coarse low coast to cover submerged triangles; other islands retain 0.8.

## Scatter and Features

What stands on an island is described in its config entry and placed by the
build, on the Balanced surface.

- **`scatter`** places a model wherever the terrain allows: a rule gives the
  model, the spacing of its candidate sites, a size range, and any of an
  elevation range in metres, a slope range and a range of distance inland.
  An optional geographic `bounds` envelope restricts it to the intended habitat.
  `scatterSites` in `lib/landmark-features.ts` draws the sites from a jittered
  grid with a fixed hash, so the same record always scatters the same
  instances. This is for vegetation such as palms.
- **`features`** stands a model at a real coordinate, for a named Feature (see
  `CONTEXT.md`). The build projects the coordinate through the same projection
  as the coastline and refuses a Feature that does not land on the island.

The placeholder is generated in `scripts/landmark-feature-models.ts`.
To supply finished models, including agent-authored reconstructions from
licensed references, set `featureFile.source` in
`content/landmark-sources.ts` to a retained GLB under
`data/landmarks/features/`, plus creator, source, rights, proof and retrieved
fields. Retain the rights document at the proof path. List its named meshes in
`featureModels`; each name must occur exactly once. Use one opaque standard
material and at most one embedded 1024 px atlas, no animation, skins or external
resources. Indexed geometry, atlas UVs and authored mesh transforms are accepted.
The build preserves the artist's GLB binary and atlas, adding only deterministic
placement metadata. Runtime expansion carries atlas UVs into the single draw.
`assets:record` pins the source and output with the supplied provenance.

All of it ships in one shared file, `public/models/landmark-features.v1.glb`:
each model once, and per Landmark a record of its instances as whole numbers
(model, position in hundredths of a world unit, heading in degrees, scale in
percent). Balanced and High request the file after entry, so it never gates the
voyage; a failed request leaves the islands as they are. The scene expands each
Landmark's record into one mesh (`expandFeatures`), so everything standing on an
island is a single draw however many models it mixes. A GPU-instanced mesh
would need one draw per model, which the budget below does not allow. Low never
requests the file and draws nothing on its islands.

The shared library retains Abrolhos's original plain banded placeholder and
its placement, and adds Boipeba's 12 textured coconut palms (2,784 expanded
triangles). The palms are project-authored full 3D reconstructions after a
licensed photograph by Panta LH; source, original references, atlas and offline
builder are under `data/landmarks/features/boipeba/`. Their CC BY-SA 3.0 credit
appears in both presentations. The Abrolhos placeholder's vertex colours sample
the atlas's white region. The village Feature reconstructs the real Igreja do
Divino Espírito Santo at its retained OSM point, adding 208 triangles. Its
solid pediment, nave, lateral volumes, roofs, bell frame, cross and footing
use licensed front/roof references and supporting aerials. Dimensions and
obscured detail are interpreted, not surveyed. Boipeba uses 2,992 Feature
triangles in total. The combined atlas uses CC BY-SA 4.0 with all original
credits retained. Low never loads this library. See
[village verification](verification/issue69-village.md) for new art/performance
evidence; physical-phone validation remains unavailable.

## Ready for the Close View

A later issue adds the Close View: an optional look from about 45–50° and half
the distance. This issue leaves the Landmarks ready for it. Feature models have
sides and a footing. Relief was scaled with the spans, and the land's shading
comes from smooth normals and baked occlusion rather than from the camera's
angle. The skirt still hangs 3.2 world units below the shoreline, under opaque
water, so no pitch above the horizon looks beneath an island. The shallows band
takes its depth from the drawn water surface, which holds from any angle.

## Budgets

| Per Landmark      | Triangles | Transfer | Draws | Instances | Instance triangles |
| ----------------- | --------: | -------: | ----: | --------: | -----------------: |
| Balanced and High |     15,000 |  250 KiB |     3 |       160 |              3,000 |
| Low               |     1,300 |   28 KiB |     2 |         0 |                  0 |

Shared Feature file: 200 KiB, requested once by Balanced and High, with at most one embedded 1024 px colour atlas.

Textures: Balanced/High use one 1024 px colour plus one 1024 px normal, at most 150 KiB together. Low uses one 512 px colour and no normal. The draws are the island, its shallows band and,
at Balanced and High, everything standing on it. The triangle and transfer
budgets are enforced twice — the build refuses to write a mesh that exceeds
them, and `bun run assets:audit` re-measures the shipped GLB. The audit also
counts the GLB's primitives, one draw each, adds the Landmark's Feature draw
when anything stands on it, and holds the total to the draw budget; it rejects
embedded terrain textures (optional maps ship separately), checks that the mesh still carries an `island` and a `surf` part,
and reconciles its triangle and byte counts with `content/landmarks.json`.

The Feature budgets are enforced the same way. The build refuses a Landmark
whose instances or their expanded triangles exceed its allowance, and a Feature
file over 200 KiB. The audit reads the shipped file back: its size, its models
and their triangle counts against the record, and each Landmark's placements
against its allowance and against what `content/landmarks.json` says stands
there.

The scene-wide draw-call and triangle budgets in `lib/production-budgets.ts`
cover the four Landmarks together with the ocean and the Ship, and are
unchanged. All authored visuals may transfer 1.8 MiB. Minimum-sailable visuals allow
1.25 MiB within a 2 MiB initial payload, and the complete first visit stays at 5 MiB. Terrain maps and
Features are classified as non-essential in payload reports.

## Verification

- `bun test` covers the geometry conversions and the shallows band in
  `lib/landmark-geometry.ts` and the shading in `lib/landmark-surface.ts`, and
  `tests/landmark-placement.test.ts` checks, against each island's real
  outline, that the Ship passes beside it and never through it and that every
  production viewport frames the whole island with room left for the Stop Card.
- `bun run assets:audit` checks provenance, budgets and the build record.
- `tests/browser/stop-cards.e2e.ts` checks in the running app that the card
  never covers a Landmark.
- `tests/asset-bake.test.ts` checks exposed and occluded surfaces, repeatability,
  colour interpolation and the coastline fallback.
- `tests/landmark-features.test.ts` checks scattering against terrain rules and
  its repeatability, every configured Feature against its real coordinate and the
  shipped file, the placement record, the single expanded geometry, the models'
  sides, and the Feature budgets, including that Low carries nothing.
- `tests/ocean-surface.test.ts` checks that `sampleOceanSheet` is the surface
  the water's grid draws at every tier.
- `tests/browser/ocean-entry.e2e.ts` checks that a Low visit requests only the
  four Low Landmark meshes and never the Feature file.
- The `asset-art` production browser project captures all four Stops in desktop
  Balanced/Low and phone Low for visual review; see [ship.md](ship.md).

### Issue #74 local hardware capture

On 2026-10-01, Chrome on the AMD Radeon RX Vega 10 completed the production
five-minute Voyage before and after the texture changes. The baseline had 159
windows, worst frame p90 19.6 ms and worst GPU p90 10.54 ms. The final capture
had 159 windows over 322,997 ms of active sailing, worst frame p90 17.0 ms and
worst GPU p90 8.83 ms, with no tier changes or windows over 20 ms. Scene maxima
remained eight draws, 41,195 triangles and two render targets. All four map
preparations started while settled, with at most two Landmarks retained. Modest
GPU normal maps were shed; Balanced mesh density stayed at its foundation level.

Local exports are retained at `evidence/issue74/before.json` and
`evidence/issue74/after.json`. An intermediate capture with one 20.5 ms window
is retained at `evidence/issue74/initial-after.json`; after that capture the
recurring preparation timer was replaced by Stop-change and completion events.
These are local measurements of an uncommitted tree, bound to the build
fingerprint in each export; clean-candidate release sign-off remains separate.

Reviewable copies of the [baseline](verification/issue74/before.json),
[final capture](verification/issue74/after.json), and
[intermediate capture](verification/issue74/initial-after.json) are committed
under `docs/verification/issue74/`.
