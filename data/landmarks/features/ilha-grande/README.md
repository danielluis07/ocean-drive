# Ilha Grande references and reconstructions — issue #71

Retrieved on 2026-10-05. These are project-authored reconstructions built
offline in TypeScript with Three.js and Sharp, not imported models or measured
architecture. No AI generation, prompts or generation output were used.

## Retained sources and rights

| Reference | Creator | Licence | Retained image / rights page |
| --- | --- | --- | --- |
| [São Sebastião front](https://commons.wikimedia.org/wiki/File:IlhaGrande-Abraao5.jpg) | Fulviusbsas | Public-domain dedication by author (PD-own) | `references/church-front.jpg` / `.html` |
| [Abraão centre and church side](https://commons.wikimedia.org/wiki/File:IlhaGrande-Abraao1.jpg) | Fulviusbsas | PD-own | `references/church-side.jpg` / `.html` |
| [Pier deck and sides](https://commons.wikimedia.org/wiki/File:Ilha_Grande_Pier.JPG) | LíviaBuhring | CC BY-SA 3.0 | `references/pier.jpg` / `.html` |
| [Cais de Ilha Grande](https://commons.wikimedia.org/wiki/File:Cais_de_Ilha_Grande.jpg) | Vihgaby | CC BY-SA 3.0 | `references/pier-deck.jpg` / `.html` |
| [Pico do Papagaio profile](https://commons.wikimedia.org/wiki/File:Pico_do_Papagaio_-_Ilha_Grande_-_RJ.jpg) | José Carlos B Fialho | CC BY-SA 3.0 | `references/peak-profile.jpg` / `.html` |
| [Pico summit and reverse slopes](https://commons.wikimedia.org/wiki/File:Pico_do_Papagaio,_Ilha_Grande.jpg) | MBelu | CC BY-SA 4.0 | `references/peak-summit.jpg` / `.html` |
| [Forested Abraão Bay](https://commons.wikimedia.org/wiki/File:Vila_do_Abra%C3%A3o_-_Ilha_Grande-RJ-Brasil_(1376952276).jpg) | Glauco Umbelino | CC BY 2.0; Commons Flickr licence review retained | `references/forest-bay.jpg` / `.html` |
| [Abraão roof/shore/canopy view](https://commons.wikimedia.org/wiki/File:Ilha_Grande_do_alto.JPG) | LíviaBuhring | CC BY-SA 3.0 | `references/village-aerial.jpg` / `.html` |
| [Lopes Mendes beach](https://commons.wikimedia.org/wiki/File:IlhaGrande-LopesMendes2.jpg) | Fulviusbsas | PD-own | `references/lopes-mendes.jpg` / `.html` |

Creative Commons 3.0 and 4.0 legal codes are retained alongside the photographs.
The peak, pier, canopy and combined atlas adaptation are **CC BY-SA 4.0**;
CC BY-SA 3.0 section 4(b) permits adaptation under a later licence with the
same elements. The church reconstruction is also offered under CC BY-SA 4.0.
Original Boipeba palm and church rights and Abrolhos lighthouse rights remain
recorded in their own directories. In-experience attribution identifies the
creators, links the reference pages and licences, and describes the adaptation.
No creator endorses this project.

## Geographic placement and interpretation

`references/places.osm.json` retains the query, endpoint, response and retrieval
date. Its OSM data is ODbL 1.0, attributed in the experience. Photograph camera
positions are not used as coordinates of the depicted objects.

- Pico do Papagaio: OSM node **510142564**, **-44.1968058, -23.1550619**.
- Igreja de São Sebastião: node **992696336**, **-44.1684089, -23.140259**.
- Abraão tourist pier: retained way **285033162**, using its landward end;
  the footprint and the two pier photos inform its straight deck, pilings and
  boarding bollards. No generic invented village houses or boats are added.
- Lopes Mendes: node **3250252561** and beach way **26161374**. The pale strip
  follows selected sea-facing points from that polygon in the terrain itself,
  with full terrain geometry, native colour/normal and independent Low colour.
  Its width is exaggerated for readability; no floating sand cutout is used.
- Other sandy pockets follow retained Abraão, Dois Rios and Aventureiro outlines.

`geometry.ts` reconstructs the church's elongated nave, front gable, square
belfry, cornices, stone-framed openings, pitched tiled roof, pyramidal cap,
cross and footing. All sides, rear and roof are closed geometry. Front and side
photos establish the silhouette; the distant bay view supports the roof and
setting. Unseen plain rear plaster and the roof underside are simplified
interpretations, not surveyed architectural facts.

The pier has top planking, side beams, an underside, submerged pilings and
boarding bollards. Its larger-than-life footprint is configured independently
of the church. It is anchored on land; its seaward end extends into the bay.
Its display seat is at least 0.44 world units; the top deck clears the
±0.395-unit swell and the exaggerated buried pilings reach below its trough.
The granite summit reconstructs the characteristic projecting beak, cleft,
rounded crown and sloping back as ten-sided sections, including a buried base.
Its north-facing beak orientation is an authored display interpretation, chosen
to expose the retained profile from the eastern side in Close View; it is
not a measured compass survey of the summit.
The forest model is a fully volumetric broadleaf crown with a trunk. Crown
variation, colour, scale and terrain-rule scatter interpret Atlantic forest;
they do not claim a tree census or identify an unsupported species.

## Atlas and storage transformations

`build.ts` starts from the retained **Abrolhos library and PNG atlas**, after
the existing Boipeba and Abrolhos builds. All their attribute bytes, node/model
order, names, UVs and material are retained. New models are appended. Existing
placement arrays remain stable; only Ilha Grande gains placements.

The allocated atlas rectangles are exported by `ilhaGrandeTiles` in
`geometry.ts`. They occupy previously unused areas and leave Boipeba's white
sample `(896,896,32,32)` intact. Every pixel outside the new rectangles retains
the original lossless PNG value. Existing UVs are unchanged.

The only photographic texture crop is the granite: **left 1740, top 1280,
width 380, height 640** in `peak-profile.jpg`, resized to **200×128**,
saturation **0.35**, brightness **1.15**, placed at **(800,736)**. It samples
rock surface, not the peak silhouette, sky, people or buildings. All other new
tiles are deterministic stucco, stone, clay courses, planks and leaf patterns
interpreted from the references. No facade or terrain photographic cutout is
embedded. glTF UVs use top-origin atlas coordinates divided by 1024, inset by
`min(20, width/4)` horizontally and `min(20, height/4)` vertically to keep JPEG/mip filtering away from unused
white atlas areas. The first combined capture exposed edge bleeding; that
superseded set is retained separately from the final corrected art.

New geometry uses signed 16-bit positions with a uniform per-node decode scale,
signed normalized eight-bit normals in four-byte aligned records, normalized
16-bit UVs and 16-bit indices, through `KHR_mesh_quantization`. The old models'
attributes and transforms are untouched. The combined atlas remains one opaque
1024px JPEG, re-encoded at **quality 78 / 4:2:0 chroma** to accommodate the added
geometry within the existing 200 KiB limit. This intentionally changes the
shared encoded texture; source pixels and completed geometry remain preserved,
and all islands require ordinary asset-art regression captures.

Run `bun run landmarks:build`, then `bun run assets:record`. All authoring and
build inputs are local and retained. The build needs no network, canvas, image
generation service or external glTF resource. Human visual approval and exact
candidate device profiling are recorded separately in the verification report.
