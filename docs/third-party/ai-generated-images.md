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

The Earth opening image at `public/images/earth-intro.v1.webp` was generated
with the same built-in workflow on 2026-09-21. Its prompt requested a complete,
realistic Earth with the South Atlantic and Brazil facing the viewer, a clear
ocean area for the transition, and empty dark space. It used no reference images.
The resulting 1254×1254 PNG was re-encoded as WebP at quality 90 with Sharp,
without cropping or upscaling. The built-in tool did not identify its exact
model version.

The Earth image prompt was:

```text
Use case: stylized-concept
Asset type: high-resolution website opening image for an Earth-to-3D-ocean zoom transition
Primary request: a breathtaking, premium, physically believable planet Earth seen from space, with the South Atlantic ocean and eastern coast of Brazil facing the camera. The viewer will zoom toward the deep blue water off Brazil, so keep a broad uninterrupted ocean area around the exact center of the globe.
Scene/backdrop: nearly black deep navy empty space, clean and uniform at the outer edges, no visible stars or nebulae.
Subject: one complete round Earth, crisp atmospheric rim, richly detailed ocean and natural cloud systems, geographically plausible eastern South America and western Africa visible at the edges of the Atlantic. The globe occupies roughly 76% of a square frame, precisely centered, with generous empty space all around.
Style/medium: editorial space photography, restrained cinematic realism, high detail suitable for a large screen, no illustration or sci-fi look.
Lighting/mood: soft daylight grazing the ocean, subtle atmospheric scattering, deep luminous blue water, refined contrast, no exaggerated bloom.
Composition/framing: square 2048-pixel style image; centered globe; centered blue ocean as the zoom destination; full planetary silhouette visible; no foreground objects.
Constraints: no text, logo, borders, UI, watermark, spacecraft, landmasses invented for decoration, or dramatic starfield.
```

OpenAI's terms grant the account owner usage rights over generated output,
including commercial use in a commissioned project such as this one. No real,
identifiable person, trademark, or brand appears in any image. The generated
Stop Account PNGs were resized and cropped to 960×720, then re-encoded as WebP with Sharp
(`bun scripts/record-assets.mjs`), which is the only transformation applied
besides format conversion; no compositing, inpainting, or upscaling was done.

Each image's Portuguese alt text in `content/editorial.ts` describes what is
shown, and its `content/asset-manifest.json` entry is marked
`sourceKind: "ai-generated"` with this file as its `proof`. These are
photographic images for a fictional brand's voyage, not evidence of current
reef, wildlife or vessel conditions.
