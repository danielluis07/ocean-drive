# Graphics dependency notices

These notices cover the direct graphics dependencies introduced by issue #24
and the open geodata the island Landmarks are built from (issue #39).
They do not replace the complete application dependency audit in issue #29.

## Landmark source data

- Coastlines: © OpenStreetMap contributors, made available under the Open
  Database License (ODbL) 1.0.
- Elevation data: SRTM courtesy of the U.S. Geological Survey, retrieved from
  the Terrain Tiles open dataset on AWS.

Sources, queries, licences and transformations are recorded in
`docs/third-party/open-geodata.md`; the same credit is shown in the experience
through `brand.dataCredit`.

## Graphics dependencies

Boipeba's coconut palms are project-authored 3D reconstructions and texture
adaptations after **Coqueiros de Moreré – Boipeba**, by **Panta LH**, under
**CC BY-SA 3.0**. The adaptation retains that licence. Reference:
<https://commons.wikimedia.org/wiki/File:Coqueiros_de_Morer%C3%A9_-_Boipeba.JPG>;
licence: <https://creativecommons.org/licenses/by-sa/3.0/>. Curved trunks,
fronds, leaflets, scale, texture crops and UVs were reconstructed or adapted.
This credit does not imply endorsement. Original bytes, rights evidence and
transformation records are retained in
[the Boipeba source record](../../data/landmarks/features/boipeba/README.md).

Velha Boipeba's **Igreja do Divino Espírito Santo** is a project-authored 3D
reconstruction after **Waltson Campos**'s CC BY-SA 3.0 front photograph,
**INPE/OBT/DPI**'s CC BY-SA 4.0 roof reference, and a supporting rear aerial by
**Marcio Filho / Ministério do Turismo** (MTur Destinos, Flickr Public Domain
Mark). Geometry, scale, unseen surface simplification, facade painting, roof
courses and atlas UVs are adapted or interpreted. The church and expanded
combined atlas use **CC BY-SA 4.0**; the original palm reconstruction retains
CC BY-SA 3.0. Original sources, rights pages, native raster extract and its
transformations are retained in the Boipeba source record above. Links:
<https://commons.wikimedia.org/wiki/File:Igreja_do_Divino_Esp%C3%ADrito_Santo.JPG>,
<https://commons.wikimedia.org/wiki/File:Boipoeba_WPM_20220520_195_130_L4_BAND43210_2m_Cont_UChar.tiff>,
<https://www.flickr.com/photos/mturdestinos/40680269815/>;
licence: <https://creativecommons.org/licenses/by-sa/4.0/>.
These credits imply no endorsement. No satellite/aerial pixels enter runtime maps.

The Del Mar Ship model is adapted from **Cruise ship** by **Poly by Google**,
<https://poly.pizza/m/dgLCxDWhnZQ>, under **CC BY 3.0**
(<https://creativecommons.org/licenses/by/3.0/>). Proportions, geometry and texture
were adapted for this project. The source listing, original GLB and full legal
code are retained; see [ship-model.md](ship-model.md) for evidence and changes.
This credit does not imply endorsement. The adaptation retains CC BY 3.0.

- Three.js 0.185.1: Copyright © 2010-2026 three.js authors.
  Source: official package `three/LICENSE`.
- React Three Fiber 9.7.0: Copyright (c) 2019-2025 Poimandres.
  Source: https://github.com/pmndrs/react-three-fiber/blob/master/LICENSE
  (retrieved 2026-09-07; the npm package declares MIT but omits the license file).
- Drei 10.7.8: Copyright (c) 2020 react-spring.
  Source: official package `@react-three/drei/LICENSE`.

The following MIT terms apply separately to each copyright holder above.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Ilha Grande reconstructions

Ilha Grande's São Sebastião church, Abraão tourist pier, Pico do Papagaio and
Atlantic canopy are project-authored full 3D reconstructions from licensed
photographs. Sources include Fulviusbsas (public-domain dedication), LíviaBuhring,
Vihgaby and José Carlos B Fialho (CC BY-SA 3.0), MBelu (CC BY-SA 4.0) and Glauco
Umbelino (CC BY 2.0). Reference links, original files, rights-page snapshots,
mapped coordinates, geometry interpretations and exact texture transformations
are retained in [the Ilha Grande source record](../../data/landmarks/features/ilha-grande/README.md).

The reconstructed models and combined atlas adaptation use
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The granite
texture uses a surface-only crop from José Carlos B Fialho's photograph;
all other new material tiles are interpreted deterministic artwork. The shared
JPEG is re-encoded; previous model attributes, UVs and occupied source PNG
pixels are preserved. Original palm rights remain CC BY-SA 3.0. In-experience
credits link the creators and source pages. These credits imply no endorsement.
