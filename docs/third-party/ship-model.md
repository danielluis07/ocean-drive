# Maré Mansa model provenance

The Ship is an adaptation of **Cruise ship**, by **Poly by Google**, published
September 25, 2017 and retrieved September 19, 2026 from
<https://poly.pizza/m/dgLCxDWhnZQ>. The listing explicitly links **CC BY 3.0**
(<https://creativecommons.org/licenses/by/3.0/>). This applies to the downloaded
mesh and embedded base-colour texture. No endorsement by the creator is implied.

## Retained evidence

- `ship/source.html`: the source listing as retrieved, including its creator,
  `Licence: CC-BY 3.0` metadata and the link to the licence.
- `ship/CC-BY-3.0.txt`: the full legal code, retrieved from
  <https://creativecommons.org/licenses/by/3.0/legalcode.txt>.
- `data/ship/cruise-ship.glb`: the unmodified 4,758-triangle source, downloaded
  from <https://static.poly.pizza/ec84612a-823d-40e7-86c0-236d03c4bad5.glb>.

The source, snapshot and legal code are SHA-256 pinned in
`content/asset-manifest.json`. They are not served by the application. The
licence permits commercial adaptation and redistribution with attribution;
there is no purchase or separate rights transfer to claim. Attribution, source
and licence links and an adaptation notice appear in the reading presentation
and the full itinerary Sheet through `components/voyage/ship-credit.tsx`.
Each shipped GLB also embeds a copyright attribution and the source/licence URLs.

## Modifications

`scripts/build-ship.ts` adapts the retained glTF; it does not generate a vessel
from primitives. It rotates the bow to -Z, broadens the beam to 2.65 world units,
sets length to 6.4, lowers the superstructure, and places the bottom 0.22 units
below the waterline. The observation lounge, open foredeck, tenders, stepped
decks, deck furniture and window atlas come from the source model.

UV-aware Meshoptimizer simplification creates Balanced and Low meshes. Vertex
attributes are quantized with glTF's `KHR_mesh_quantization` extension (decoded
by Three without a downloaded codec). Unreferenced vertices are removed. The
2048px source atlas is resized to an opaque 512px / 256px JPEG embedded in each
GLB. Both use one opaque material, one texture, one draw, and no animation or
skin. The fictional adaptation is named **Maré Mansa** in its glTF node.

The adaptation remains available under CC BY 3.0. Preserve the attribution and
licence when redistributing it. Budgets, reproduction and camera checks are in
`docs/ship.md`; measured bytes are recorded in `content/ship.json`.
