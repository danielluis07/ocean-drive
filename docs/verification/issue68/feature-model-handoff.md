# Fernando de Noronha Feature model production

Prepared on 2026-10-01 for [issue #68](https://github.com/danielluis07/ocean-drive/issues/68).
This brief covers production of the missing Feature models and their handoff
to the agent implementing the island.

## Current status

No Feature model was generated, downloaded or integrated. No Blender validation
or human art approval has happened. The connected Higgsfield account rejected
the Hunyuan generation request with `not_enough_credits`. Blender was not found
on PATH or in the usual Windows installation directories. Supplying generation
credits or licensed base models is the next dependency.

## Real places and reference material

The reference pages below were checked on 2026-10-01. They are links, not
imported assets or retained licence evidence. Before uploading any photograph
to a generation service, retain its original file, source-page snapshot,
creator credit and licence. If a photograph is used as model input or texture
source, carry its attribution and applicable adaptation terms into the model's
provenance; do not describe such output as exclusively project-authored.

| Feature | Evidence/reference | Rights listed on the photo page |
| --- | --- | --- |
| Morro do Pico | [Photo by Andrei](https://commons.wikimedia.org/wiki/File:Morro_do_Pico_-_Fernando_de_Noronha.jpg) | CC BY 2.0 |
| Dois Irmãos | [Photo by Walter Ferry Dissmann](https://commons.wikimedia.org/wiki/File:Dois_irmaos_fernando_de_noronha_by_ssabbath-d7o7enm.jpg) | CC BY-SA 4.0 |
| Forte de Nossa Senhora dos Remédios | [Ruins photographed by Thiago Tiganá](https://commons.wikimedia.org/wiki/File:Forte_Nossa_Senhora_dos_Rem%C3%A9dios.JPG) | CC BY-SA 3.0 |
| Vila dos Remédios | [Church and surroundings seen from the fort](https://commons.wikimedia.org/wiki/File:Igreja_de_Nossa_Senhora_dos_Rem%C3%A9dios_vista_do_Forte_dos_Rem%C3%A9dios_-_Fernando_de_Noronha,_Brasil.jpg) | Verify the selected original's attribution and licence before acquisition |

The [Brazilian Geological Survey's Noronha report](https://rigeo.sgb.gov.br/bitstream/doc/23740/1/relatorio_fernando_de_noronha_pe_2023.pdf)
identifies Morro do Pico as a phonolite dome. Use that geology when authoring
the spire; the island's dark basalt surface palette does not mean every named
rock is basalt. The report is a factual reference, not a licensed texture input.

Morro do Pico needs its asymmetric upright silhouette, irregular summit and
steep weathered faces. Dois Irmãos needs two distinguishable stacks and their
actual spacing and shapes; retain separate mesh origins if placing each at its
own coordinate. The fort needs its real irregular enclosure, masonry, entrance
and current condition, checked from multiple views. A generic castle or a
regular star fort is insufficient. The village requires identified existing
buildings and their actual relative arrangement; do not generate a cluster of
invented houses. If the full village cannot be substantiated, propose a smaller
real named Feature for human visual review before replacing it in the issue.

## Delivery contract

Read the current budgets in `content/landmark-sources.ts` and
`docs/landmarks.md` before delivery. Noronha has **3,000 expanded Feature
triangles total**, not 3,000 per source mesh. No vegetation allowance is left
implicitly outside that total. The shared library has a **200 KiB** limit across
all Stops and at most **one embedded 1024×1024 colour atlas**. Deliver textured,
complete models with one opaque standard material, no animations, skins or
external resources. A possible working triangle allocation is:

| Model group | Proposed triangle ceiling |
| --- | ---: |
| Morro do Pico | 800 |
| Both Dois Irmãos stacks combined | 600 |
| Verified Vila dos Remédios buildings | 650 |
| Fort | 900 |
| Total | 2,950 |

These allocations are authoring targets, not approvals. Adjust them after
checking silhouettes and readability at the production camera. Preserve detail
in the atlas rather than creating more draws. Geometry needs all visible sides,
an appropriate footing and stable normals. Centre each origin at its footing;
export in the pipeline's +Y-up coordinate system with applied transforms and a
recorded front direction. Record the intended world-unit dimensions so the
integration agent can choose exaggerated display scale without guessing units.

Retain the original high-resolution GLBs, editable `.blend` cleanup file,
shared atlas source, optimized combined GLB, generation input/prompt/settings
and output/job record, creator/source/rights proof, retrieval date and a log of
Blender changes under `data/landmarks/features/`. Do not put source artwork in
`public/`. A generated base is not a finished, Blender-checked model.

The shared source importer requires the named meshes to match `featureModels`
exactly. Names should be agreed with the integration agent; suggested names are
`morro-do-pico`, `dois-irmaos-west`, `dois-irmaos-east`, `vila-dos-remedios`,
and `forte-dos-remedios`. These are suggestions only and are not registered.
Account for the current Abrolhos foundation placeholder when replacing the
shared library; do not silently remove or substitute that Stop's model.

## Generation route and observed blockers

Use the Higgsfield CLI's unfiltered model list to confirm available models, then
inspect each model's current schema. `multi_image_to_3d` accepts 1–4 reference
images and `should_texture: true`; it is the preferred reference-based route.
Only use multiple images of the same object with consistent geometry. For the
village and fort, use verified photos and plans rather than asking a text model
to invent missing architecture.

Two text-based base-mesh attempts were made without producing output:

- `meshy_v6_text_to_3d` failed locally on an unsupported CLI validation rule
  (`!params.enable_animation || params.enable_rigging`) in Higgsfield CLI
  1.1.23. Confirm a corrected CLI before retrying that model.
- `hunyuan3d_v3_1_text_to_3d` accepted a `pro` request with `face_count: 40000`
  and `enable_pbr: true`, then returned `not_enough_credits`. A 900-face request
  was rejected because the current schema requires at least 40,000 faces.
  Generate a detailed base, then clean and reduce it in Blender; do not assume
  the service can emit the final runtime budget directly.

The Hunyuan prompt was:

```text
Morro do Pico, Fernando de Noronha: an asymmetric upright phonolite volcanic plug, blunt uneven summit, near vertical cracked gray stone walls, wider irregular foot. Rock only; no ground or buildings.
```

This prompt has no visual approval and is only a starting point for a base mesh.
Prefer verified photographic input for the next attempt. Retain the applicable
[Higgsfield terms](https://higgsfield.ai/terms-of-use-agreement) and
[output ownership guidance](https://higgsfield.ai/creator-hub/help-center/account/who-owns-my-generations-and-can-i-use-them-commercially)
with any actual output. Neither a failed request nor this brief constitutes
licence evidence for a model that does not exist.

## Integration handoff

The island agent should configure the supplied source in `featureFile.source`,
register the final mesh names, and record verified coordinates, heading and
display scale in Noronha's `features` entry. Check that both sea-stack sites are
represented by the retained coastline: the build refuses Features outside the
land and the island's currently filtered rings must not be assumed sufficient.
Do not move a stack onto the main island to bypass that check. Evaluate whether
a source-data/ring-selection update is needed once its real site is verified.

Run `bun run landmarks:build`, `bun run assets:record`, `bun run assets:audit`
and the Landmark tests after integration. Verify reproducible assets, shared
atlas preservation, budgets and Low's absence of Features. Check Stop Card
clearance using the production browser suite. Generate the three Noronha
review views with:

```powershell
bun run build
bunx --bun playwright test --config playwright.production.config.ts --project asset-art --grep 'Stop 01'
```

Review desktop Balanced, desktop Low and phone Low captures with the project
owner. Inspect the final Close View camera for underside exposure, model sides
and horizon framing. Keep those criteria Unvalidated until the actual captures
and models receive human review. Issue #68 remains open and incomplete.
