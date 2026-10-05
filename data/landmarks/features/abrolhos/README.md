# Abrolhos reconstruction and retained references — issue #70

Retrieved on 2026-10-05. These are project-authored reconstructions, created
offline in TypeScript using Three.js geometry and Sharp texture encoding.
No AI generation, prompt, generation output or imported base model was used.

## References and rights

- [Farol da Ilha de Santa Bárbara](https://commons.wikimedia.org/wiki/File:Farol_da_Ilha_de_Santa_B%C3%A1rbara.jpg),
  **Munique Bassoli**, CC BY-SA 4.0. Original photograph and Commons rights page:
  `references/lighthouse-front.jpg` / `.html`.
- [Farol de Abrolhos](https://commons.wikimedia.org/wiki/File:Farol_de_Abrolhos.jpg),
  **Alicedaraujo**, CC BY-SA 4.0. Original photograph and Commons rights page:
  `references/lighthouse-side.jpg` / `.html`.
- [Abrolhos — Ilha de Santa Bárbara / BA](https://commons.wikimedia.org/wiki/File:Abrolhos_-_Ilha_de_Santa_B%C3%A1rbara_BA_(52114916684).jpg),
  **Gabi Carrera / Marinha do Brasil**, CC BY-SA 2.0, confirmed by Commons
  Flickr licence review. `references/island-aerial.jpg` / `.html`; despite its
  retained filename, this is an oblique shore view, not an aerial survey.
  Supporting terrain and lighthouse-side reference; no photographic pixels
  are embedded in the model or terrain textures.
- [OSM lighthouse node 1181469524](https://www.openstreetmap.org/node/1181469524),
  OpenStreetMap contributors, ODbL 1.0; API snapshot in
  `references/lighthouse.osm.json`. Use its **-38.694069, -17.9648083**
  coordinate rather than the photographs' incorrectly located camera metadata.
  The feature remains on the retained Santa Bárbara coastline.

The lighthouse and new atlas adaptation are distributed under
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/), with retained
legal code. CC BY-SA 2.0 section 4(b) permits a later licence with the same
elements for an adaptation. Existing palm rights remain CC BY-SA 3.0 and the
church/atlas rights remain CC BY-SA 4.0; see the adjacent Boipeba record.
Attribution in the experience links the reference creators and licences.
No creator endorses this project.

## Geometry interpretation

`lighthouse.ts` reconstructs the cylindrical black-and-white cast-iron tower,
two projecting galleries with visible undersides and guardrails, the upper
lantern housing, opaque interpreted glazing, domed roof and finial. Circular
sections are twelve-sided, with fully modelled circumference, roof and base.
The footing extends 0.28 world units below its sampled seat. Proportions are
interpreted from the photos, widened for readability at the production camera;
they are not measured architecture. No unrelated house or antenna is invented.

The silhouette and bands carry identification at aerial distance. Lantern
subdivisions and paint/weathering are authored in the atlas from the references'
appearance. Geometry is indexed offline; runtime expands it through the existing
single-draw Feature pipeline. Placement scale is larger than life, recorded in
`content/landmark-sources.ts`. Low has no Feature instances.

## Atlas, preservation and reproducibility

`build.ts` starts from Boipeba's retained library and PNG atlas. Boipeba's raw
attribute bytes, mesh names, UVs and material remain unchanged. Its palms and
church stay in the same model slots; the unused historical placeholder is
replaced in slot zero by the named lighthouse. Its unused attribute prefix is
removed, with Boipeba's original attribute values preserved byte for byte.

New authored tiles occupy unused atlas rectangles only (pixels, top-left origin):
white paint `(800,16,200,160)`, black paint `(800,192,200,144)`, lantern
`(800,352,200,144)`, footing `(800,528,200,192)`. Every face maps its tile to
glTF top-origin UVs `(x/1024, y/1024)`. There are **no photographic texture crops**; these
tiles are deterministic paint/grain, glazing frames and masonry interpretation.
Ring UVs run continuously around each circumference. UV storage uses normalized
16-bit integers, normals use signed normalized 8-bit values with four-byte
vertex alignment and `KHR_mesh_quantization`, and positions retain Float32
precision. White vertex colour is supplied by the existing expansion fallback.
These storage transformations preserve geometry and do not require a decoder.
All pixels outside those rectangles retain the source PNG values. The combined
JPEG is encoded with Sharp at quality 85, 4:4:4 chroma. One opaque material and
one shared embedded 1024px atlas remain; no external glTF resources are added.

Run `bun run landmarks:build` to build Boipeba's retained library, append the
lighthouse and its atlas tiles, and export terrain plus placements. Then run
`bun run assets:record`. Both steps use retained local inputs only. Retained
sources and output hashes are in the provenance ledger and issue verification.
Human art review and physical-device evidence are separate acceptance gates.
