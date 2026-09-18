# Open coastline and elevation data provenance

Issue [#33](https://github.com/danielluis07/ocean-drive/issues/33) superseded the
previous policy that forbade maps and bathymetry: "open elevation/coastline
data" is now allowed for the island Landmarks, recorded here with its source,
licence and transformation history, per issue
[#39](https://github.com/danielluis07/ocean-drive/issues/39).

The four Landmarks — Fernando de Noronha, Ilha de Boipeba, Arquipélago de
Abrolhos and Ilha Grande — are built from two open datasets. Both were recorded
once into `data/landmarks/<id>.json` by `bun run landmarks:fetch`, and those
records are committed. Every later build reads only the records, so no
deployment, test or asset build reaches the network.

## Coastlines — OpenStreetMap

`natural=coastline` ways inside each island's query box, retrieved on
2026-09-17 through the public Overpass API at
`https://overpass-api.de/api/interpreter`. The exact query and the database
timestamp Overpass reported are stored in each record.

OpenStreetMap data is made available under the **Open Database License
(ODbL) 1.0**, <https://opendatacommons.org/licenses/odbl/1-0/>. It requires
attribution, and requires that a Derived Database be released under the same
licence. The meshes are a Produced Work — a rendering of the data, not a
database — so the ODbL requires attribution, which
`docs/third-party/graphics-notices.md` and the in-app notices carry:

> © OpenStreetMap contributors, ODbL 1.0

The recorded rings in `data/landmarks/` are a Derived Database of OSM and stay
under ODbL 1.0; they carry the same notice in the record itself.

Transformation: directed coastline ways were chained on their shared end nodes
into closed island rings; open chains (a mainland shore leaving the query box)
and inner water bodies were discarded; rings too small or too far from the
largest island were dropped; coordinates were rounded to six decimal places.
The build then projects the rings to metres about their own centre, scales them
so each island spans the world units recorded in `content/landmark-sources.ts`,
and simplifies them to the detail the production camera can resolve. No
coordinates were invented, moved or reshaped.

## Elevation — SRTM via Terrain Tiles

Elevation was retrieved on 2026-09-17 from the **Terrain Tiles** open dataset on
AWS, <https://registry.opendata.aws/terrain-tiles/>, in Mapzen's `terrarium`
PNG encoding at `https://s3.amazonaws.com/elevation-tiles-prod/terrarium`. Each
record lists the exact tile URLs it was built from.

Over the Brazilian coast, Terrain Tiles carries the **Shuttle Radar Topography
Mission (SRTM)** 1 arc-second global dataset, a work of the U.S. Government
distributed without restriction and in the public domain. The dataset's own
attribution guidance is at
<https://github.com/tilezen/joerd/blob/master/docs/attribution.md>, and asks
for:

> Elevation data: SRTM courtesy of the U.S. Geological Survey

Transformation: terrarium pixels were decoded to metres with
`red * 256 + green + blue / 256 - 32768`, the tiles covering each island's
coastline were assembled, and the result was resampled to one square grid of
whole metres over that island's bounds and stored base64-encoded. The build
samples that grid bilinearly, clamps it at sea level, and scales it to the world
height recorded per island. Heights are compressed with the island's own scale;
they are not a survey and must not be read as one.

## What the meshes are, and are not

Each island's outline and relief come from the data above. Everything else —
how large the island is in Voyage Waters, where it sits beside the Charted
Route, and the sand/rock/vegetation palette it is shaded with — is authored in
`content/landmark-sources.ts` and `lib/ocean-config.ts`, and is presentation,
not measurement. Distances between Stops are deliberately compressed, and each
island is scaled on its own so that a 2 km archipelago and a 30 km island both
read from the same camera. The Landmarks are recognisable portraits of real
places inside an openly fictional voyage, not a chart, and nothing in the
experience should be used for navigation.
