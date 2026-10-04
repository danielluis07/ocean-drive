# Boipeba terrain — issue #69

The retained OSM coastlines and SRTM grid in `data/landmarks/boipeba.json` are
unchanged. See [open-geodata.md](open-geodata.md) for their ODbL/public-domain
rights. All new surface detail is project-authored interpretation, not newly
surveyed geography, land cover or bathymetry.

The [Bahia environment agency's APA description](https://www.ba.gov.br/inema/gestao-2/unidades-de-conservacao/apa/apa-ilhas-do-tinhare-e-boipeba)
documents estuarine mangroves, restinga, beaches and reefs. The
[retained licensed photographs and reconstruction record](../../data/landmarks/features/boipeba/README.md)
provide visual references. No satellite pixels or photographic pixels are used
in the terrain maps. No runtime generation or extra texture fetch is introduced.

`content/landmark-sources.ts` configures a 1.05-unit relief above the existing
0.44-unit swell clearance, 2-unit sandy coastal margin, and 5.6-unit shallows.
The shallows overlap the land by 1.6 terrain-grid steps, covering the submerged
coastal triangles that exposed small water-band gaps in the baseline Low view.
The eastern ocean-facing margin receives long pale beaches; low western ground
receives darker mangrove-like vegetation, blending into lighter restinga.
The west/east transition is an authored projected X mask (1–7 world units),
combined with DEM height around 12 m. It is not a mapped habitat boundary.
Unlike Noronha, low coastal banks do not become basalt cliffs. Rock is exposed
only on steep ground. Bounded authored relief is at most ±0.025 world units,
tapered at the waterline. Native 1024px colour/normal and independent 512px colour
use the existing single scalar occlusion bake; fallback vertices retain it too.

Moreré's reef-pool colour patch is centred on retained OSM node 11373298569
(-13.5953085, -38.8987980). Its 2.6×1.8 world-unit elliptical radii and mottled
pale-water appearance are artistic interpretation. A scalar vertex channel on
the existing shallows mesh localises the effect in both terrain tiers. The
material defaults that channel to zero on every other island. No water depth,
reef perimeter or tidal prediction is represented.

Balanced selective sampling spends geometry on coast and slopes. Low keeps its
coarse geometry, independent colour-only texture and no Feature meshes. Other
islands' terrain bytes must remain identical. The shared Feature file changes
only to add the textured palms while retaining Abrolhos's existing model and
placement. All texture preparation, retention, fallback and quality controls
remain active. Build offline with `bun run landmarks:build`, then record with
`bun run assets:record`.

The owner approved this terrain-and-palms candidate on 2026-10-04. The village
church is a subsequent addition with its own retained references and review;
terrain bytes are unchanged. Physical-phone evidence remains unavailable; see
[issue69 verification](../verification/issue69.md).
