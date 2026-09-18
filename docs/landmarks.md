# Island Landmarks

Implements [#39](https://github.com/danielluis07/ocean-drive/issues/39). Each of
Stops 01–04 is identified by the island it really is: Fernando de Noronha,
Ilha de Boipeba, the Arquipélago de Abrolhos and Ilha Grande. The Landmarks
carry no label, marker or light; the shape of the land is the identification.

One pipeline builds all four, and adding a fifth island is a config entry.

## The pipeline

```text
content/landmark-sources.ts   what to build, how big, how it is shaded
        │  bun run landmarks:fetch          (network; maintenance only)
        ▼
data/landmarks/<id>.json      recorded coastline rings + elevation grid
        │  bun run landmarks:build          (offline, deterministic)
        ▼
public/models/landmark-<id>-<tier>.v1.glb   the shipped meshes
content/landmarks.json        what the scene and CI read back
```

**`content/landmark-sources.ts`** is the only place an island is described: its
query box in degrees, the zoom and grid of its elevation samples, which
coastline rings belong to it, how many world units it spans, how high it
stands, how wide its surf line is, and the sand/rock/vegetation palette it is
shaded with. `landmarkBudget` in the same file holds the triangle and transfer
budget each quality tier may spend on one Landmark.

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
   waterline at the shore so the swell never uncovers a seam, and hangs a skirt
   under the shoreline so the camera's remaining perspective cannot look under
   the island;
5. shades every vertex by height and slope — sand where the land is low and
   flat, bare rock where it is steep, vegetation between, lighter toward the
   summit — and bakes that into vertex colours, so a Landmark carries no
   texture at all;
6. builds the surf band around the shoreline; and
7. exports `island` and `surf` as one glTF, then records what it actually wrote
   in `content/landmarks.json`.

The sample spacing is not tuned by hand. The build estimates it from the
island's area, measures what came out, and coarsens until the Landmark fits its
tier's budget — which is why a new island needs no more than its config entry.

## Placement

`lib/ocean-config.ts` places each Landmark. The Charted Route runs west and
every island sits due north of its anchorage, so the Ship passes along the
island's southern shore instead of sailing at it, and the near top-down camera
frames the whole island above the Ship with the Stop Card clear to the side.
`content/landmarks.json` records each island's extent and the radius of the
square about its centre that holds it; the scene projects that every frame as
`--landmark-*`, which is what keeps the Stop Card off the island (the surf band
beyond it is water the card may stand over) (see
[minimal-chrome.md](minimal-chrome.md)).

Distances in Voyage Waters are deliberately compressed, and each island is
scaled on its own so that a 2 km archipelago and a 30 km island both read from
the same camera. The outlines are true; the sizes and the distances are not.

## The surf line

`lib/landmark-surf.ts` draws the band the build lays around each shoreline. Its
vertices include `oceanSwellShader` from `lib/ocean-surface.ts` — the documented
shoreline hook — and displace by the same swell the water uses, with the same
clock, so the foam stays attached to the water rather than floating at a fixed
height. That holds at every quality tier: the band is its own mesh and its own
program, so it does not depend on the ocean's decorative shader, which the Low
tier sheds.

The band's UVs carry world-unit arc length along the shore and the distance out
from it, so the foam keeps one scale on every island. Sets of breakers roll
shoreward over shallows that pale against the land. With
`prefers-reduced-motion`, the `motion` uniform drops to zero and the sets hold
still: the same band, as a static foam ring.

One material serves all four Landmarks, so the shoreline costs one program and
one draw per island.

## Budgets

| Per Landmark      | Triangles | Transfer | Draws |
| ----------------- | --------: | -------: | ----: |
| Balanced and High |     4,400 |   76 KiB |     2 |
| Low               |     1,300 |   28 KiB |     2 |

Textures: none, at any tier. The two draws are the island and its surf band.
The triangle and transfer budgets are enforced twice — the build refuses to
write a mesh that exceeds them, and `bun run assets:audit` re-measures the
shipped GLB. The audit also counts the GLB's primitives, one draw each, against
the draw budget, rejects any texture, checks that it still carries an `island`
and a `surf` part, and reconciles its triangle and byte counts with
`content/landmarks.json`.
The scene-wide draw-call and triangle budgets in `lib/production-budgets.ts`
cover the four Landmarks together with the ocean and the Ship.

## Verification

- `bun test` covers the geometry conversions in `lib/landmark-geometry.ts` and
  the shading in `lib/landmark-surface.ts`, and
  `tests/landmark-placement.test.ts` checks, against each island's real
  outline, that the Ship passes beside it and never through it and that every
  production viewport frames the whole island with room left for the Stop Card.
- `bun run assets:audit` checks provenance, budgets and the build record.
- `tests/browser/stop-cards.e2e.ts` checks in the running app that the card
  never covers a Landmark.
