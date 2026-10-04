# Boipeba reconstruction sources — issue #69

Palm references retrieved 2026-10-03; village references added 2026-10-04.
Authored by Ocean Drive project contributors through Bun,
Three.js geometry and Sharp; no model generation service or AI image generator
was used. Sources are `build.ts` and `village.ts`; `bun run landmarks:build` regenerates the
source `library.glb`, editable `atlas.png`, and the shipped shared Feature GLB
offline. The generator preserves the existing Abrolhos placeholder geometry,
vertex colours and placement, adding UVs into a white atlas region.

## Coconut palm

Reference: [Coqueiros de Moreré – Boipeba, Panta LH](https://commons.wikimedia.org/wiki/File:Coqueiros_de_Morer%C3%A9_-_Boipeba.JPG),
own work, photographed 2014-04-16, **CC BY-SA 3.0 Unported**.
Original photograph: `references/palms.jpg`; retained description/rights page:
`references/palms.html`; full licence: `references/CC-BY-SA-3.0.txt`.
The palm mesh and atlas adaptation are distributed under the same licence:
<https://creativecommons.org/licenses/by-sa/3.0/>. Changes are described below;
neither the photographer nor Wikimedia endorses this project.

The project-authored reconstruction interprets the photograph's curved tapered
trunk, radiating arched crowns and divided pinnate leaves. It has eight fronds,
individual leaflets with both faces, a closed trunk, and a footing 0.18 world
units below its origin. It is a representative coconut palm, not a survey of
an individual tree. Heights and crown spans are enlarged for the production
camera. No façade plane, transparent silhouette or photographic cutout is used.

One opaque material uses one embedded 1024×1024 JPEG atlas. The retained PNG is
its editable source. The expanded combined atlas is CC BY-SA 4.0; the original
palm reconstruction remains available under CC BY-SA 3.0. Bark is cropped from the 3072×4608 original at
`left=480, top=1845, width=24, height=35`, resized to 256×480, with brightness
1.25 and saturation .65. The leaf tile (x=256–767, y=0–479) is an authored green
rib/vein interpretation. The original white sample is retained alongside the
new church tiles. Geometry uses UVs directly into these regions; there is no UV rotation
or photographic projection over a flat model. The JPEG uses quality 85, 4:4:4.

Palms scatter only on the recorded island, 0–25 m elevation, gentle slopes,
and 0.8–2.3 world units inland in the configured eastern coastal envelope.
Positions are deterministic terrain-rule samples, **not surveyed tree locations**.
The reference's camera geotag appears identically on several different beach
photographs; it is not used as an individual tree coordinate.

## Natural surface references

- [Boipeba – praia de Moreré](https://commons.wikimedia.org/wiki/File:Boipeba_-_praia_de_Morer%C3%A9.JPG),
  Panta LH, CC BY-SA 3.0, `references/shore.jpg` and `.html`.
- [Piscinas Naturais de Moreré](https://commons.wikimedia.org/wiki/File:Piscinas_Naturais_de_Morer%C3%A9.jpg),
  Kayo Alvares Barboza, CC BY-SA 3.0, `references/pools.jpg` and `.html`.
- [Boca da Barra em Boipeba](https://commons.wikimedia.org/wiki/File:Boca_da_Barra_em_Boipeba.JPG),
  Waltson Campos, CC BY-SA 3.0, `references/village-shore.jpg` and `.html`.

These photographs inform colour and landform interpretation; their pixels are
not used in terrain textures. Rights are evidenced by the retained pages and
licence. Moreré's point is OSM node 11373298569, retained in
`references/morere.osm.json`, latitude -13.5953085, longitude -38.8987980,
© OpenStreetMap contributors, ODbL 1.0. The pool extent and appearance are
authored; no measured bathymetry or reef boundary was obtained.

## Village Feature: Igreja do Divino Espírito Santo

[Igreja do Divino Espírito Santo](https://commons.wikimedia.org/wiki/File:Igreja_do_Divino_Esp%C3%ADrito_Santo.JPG),
Waltson Campos, CC BY-SA 3.0, is retained as `references/church.jpg` / `.html`.
It establishes the blue front, white trim, curved pediment, three upper windows,
bell opening and side annex. That photograph alone was insufficient for the
original candidate. A second inspected Commons photograph,
[Festa do Divino, 2018](https://commons.wikimedia.org/wiki/File:20.05.2018_Cairu_Boipeba_Festa_do_Divino_Esp%C3%ADrito_Santo_(42264178461).jpg),
by Deputado Rosemberg, shows a procession on the village street rather than the
church volume. It is retained as `references/church-festival.jpg` / `.html`
as rejected reference evidence; its upstream page records the author's Flickr
Public Domain Mark and Commons review. It is not used in the asset adaptation.

The retained OSM API map extract `references/church-area.osm.xml` supplies
church node 2437014945 at -13.5825102, -38.9272361, but no building footprint.
`references/church.wikidata.json` (Q104716494, CC0 structured data) corroborates
the location. Overpass requests failed (406 and timeout); the direct OSM API
succeeded. The church anchor retains that mapped point. Its approximately
south-southwest front bearing (210°) is interpreted from the roof reference and
the approach to Praça Santo Antônio, rather than measured on site.

### Additional reference coverage

- [Boca da Barra, aerial (3)](https://www.flickr.com/photos/mturdestinos/40680269815/),
  **Marcio Filho / Ministério do Turismo**, retained original 3992×2242 JPEG
  `references/church-rear-aerial.jpg` and source/rights page `.html`.
  Published by MTur Destinos with Flickr's **Public Domain Mark** (license ID 10).
  The uphill building's pale rear and wooded setting are visible from the
  river. Canopy obscures parts of the roof and lateral walls; this is supporting
  visual evidence, not a measured elevation or complete photographic survey.
- [Boca da Barra, east aerial](https://www.flickr.com/photos/mturdestinos/39166727470/),
  the same creator and publisher, original 3992×2242 JPEG
  `references/village-aerial-east.jpg` and `.html`, Public Domain Mark.
  It establishes the surrounding waterfront and village scale. No waterfront
  houses are invented or extracted from it, and no aerial pixels enter the atlas.
- [INPE Boipeba CBERS-4A raster](https://commons.wikimedia.org/wiki/File:Boipoeba_WPM_20220520_195_130_L4_BAND43210_2m_Cont_UChar.tiff),
  **INPE/OBT/DPI**, 2022-05-20, **CC BY-SA 4.0**. Retained rights page:
  `references/church-roof-source.html`; native reference extract:
  `references/church-roof.png`. The original TIFF is 754,099,501 bytes and is
  not shipped or committed. Its SHA-256, URL, affine transform, crop rectangle,
  coordinate conversion and retrieval date are in `references/church-roof-crop.json`.
  The 240×240 extract is the first decoded channel, without resizing. Its
  EPSG:32724 grid is sampled at 1 m, which does **not** imply 1 m effective
  survey accuracy. At the OSM point it constrains the roof's location, axis and
  compact elongated mass; canopy, sensor blur and registration limit dimensions.

The named church's Latin-cross plan, two sacristies and exterior bell frame
are also described in the [local architectural account](https://www.boipebatur.com.br/post/igreja-do-divino-espirito-santo-de-boipeba).
That account supplies architectural facts only; none of its photographs or prose
is reproduced in the asset. The new refs complement the front reference rather
than claiming that the front image supplied unseen geometry.

### Reconstruction and its limits

`village.ts` builds `boipeba-divino-church` as project-authored full 3D geometry:
a closed nave, two lower lateral volumes, three pitched roofs, an extruded
curved front/pediment, a real open bell frame with hanging bell, cross and a
masonry footing. Facade details are manually interpreted from Waltson Campos's
photograph. The roof/rear references constrain the overall building volume;
obscured openings are left plain rather than adding unsupported decorations.
This is an enlarged interpretation of a specific real monument, not a survey,
photographic cutout or generic village house. It does not reproduce the entire
village or assert the church's current paint state after later renovations.

The local nave is 1.16 units wide and 2.12 deep, with 1.02-unit eaves and a
1.36-unit ridge. These proportions, lower annex extents and 0.8 placement scale
are authored estimates. The cross reaches 1.85 units; the footing extends to
−0.24. Heading is 210°; the anchor is exactly the retained OSM point. The mesh
uses 208 triangles, leaving the unchanged 12 palms at 2,784 triangles and all
Boipeba Features at 2,992 of the existing 3,000-triangle allowance.

No pixels from the new reference images are embedded. The authored facade SVG
fills atlas x=8–391, y=512–1023, showing shutters, portal, white trim and crest;
plaster uses x=408–647, y=528–767, masonry x=664–751 in the same rows, and
roof courses x=408–743, y=784–991. UVs map those regions onto full volumes.
Pale walls, bell-frame trim and cross sample the existing white region. The
palm's original bark/leaf regions and UVs remain unchanged, and Abrolhos still
samples its original white point. Export remains one opaque material and one
embedded 1024px JPEG (quality 85, 4:4:4); no new draw or runtime texture request.

The new church reconstruction and combined atlas are **CC BY-SA 4.0**, retaining
Waltson Campos, Panta LH and INPE attribution. CC BY-SA 3.0 section 4(b) permits
adaptations under a later version with the same license elements; both legal
codes are retained. Public-domain-marked references retain their publisher and
photographer credit. No creator or institution endorses this project.

Build offline with `bun run landmarks:build`. Source code, original aerials,
retained raster extract, attribution and editable atlas are available here.
The terrain/palms candidate received owner visual approval on 2026-10-04;
that approval precedes this church addition. The village captures require
separate human review. Physical-phone performance remains unvalidated.
