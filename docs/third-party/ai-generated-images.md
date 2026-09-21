# AI-generated photographic image provenance

Issue #33 superseded the previous policy that forbade generative final visuals:
AI-generated visuals are now allowed for the Travessia voyage content, recorded
here with their generation tool, licence basis and
transformation history, per issue #38.

The six Stop Account images under `public/images/` were generated with the
project owner's OpenAI account using the built-in GPT Image generation workflow,
retrieved 2026-09-21. Each prompt described a real place, animal or reef
structure named in `content/editorial.ts` (Fernando de Noronha, Boipeba,
Abrolhos, Ilha Grande) and requested a realistic editorial travel or wildlife
photograph. No uploaded reference photos, scientific imagery, or third-party
artwork were used as input.

OpenAI's terms grant the account owner usage rights over generated output,
including commercial use in a commissioned project such as this one. No real,
identifiable person, trademark, or brand appears in any image. The generated
PNGs were resized and cropped to 960×720, then re-encoded as WebP with Sharp
(`bun scripts/record-assets.mjs`), which is the only transformation applied
besides format conversion; no compositing, inpainting, or upscaling was done.

Each image's Portuguese alt text in `content/editorial.ts` describes what is
shown, and its `content/asset-manifest.json` entry is marked
`sourceKind: "ai-generated"` with this file as its `proof`. These are
photographic images for a fictional brand's voyage, not evidence of current
reef, wildlife or vessel conditions.
