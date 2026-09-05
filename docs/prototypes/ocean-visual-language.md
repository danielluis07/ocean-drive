# Ocean-world visual language — throwaway study

Decision ticket: [Choose the ocean-world visual language](https://github.com/danielluis07/ocean-drive/issues/6).

Status: review completed. The authoritative [visual-direction resolution](https://github.com/danielluis07/ocean-drive/issues/6#issuecomment-5553432694) is recorded on the decision ticket. This branch preserves the comparison studies as primary-source material.

## Run and compare

```sh
bun install
bun run prototype
```

Open http://localhost:3001/?variant=A. Use the floating arrows or the left/right keyboard arrows to compare A, B, and C. The query parameter survives reloads. The switcher is available only in development.

Select a station in the index or on the water to demonstrate vessel movement. Open its sample reading panel, pause motion, and inspect the study notes. These controls are comparison aids, not an approved interaction model.

## Question

Which joint treatment of the ocean, Research Vessel, Field Stations, atmosphere, typography, and camera best expresses Observatório Atlântico Vivo?

## Design plan

Subject: a curious Brazilian adult retracing an ocean-research story through the fictional commission of Instituto Maré Aberta. The page invites the Visitor to connect existing observations. All studies use the same provisional station content and the approved Core Promise.

| Study | Palette | Typography | Composition | Signature |
| --- | --- | --- | --- | --- |
| A — Mar aberto | Petroleum #093b48, jade #348c91, mist #dceceb, buoy ochre #ecc180, salt #edf5f1 | Geist Sans display and body; Georgia italic emphasis; Geist Mono captions | Full-width aerial water, quiet identity above, large invitation at left, compact station index below | A small pale Research Vessel gives scale to broad water and silver wave crests |
| B — Carta viva | Atlantic #102f50, current #276881, chart cyan #9cced3, buoy yellow #f1cb77, salt #edf5f1 | Geist Sans display/body; Geist Mono navigation captions | Persistent left station rail and an orthographic schematic ocean chart; rail moves above the scene on mobile | All destinations are legible together, joined by a schematic route |
| C — Caderno de bordo | Mineral #29686b, water green #69a6a0, pale blue-green #dae9e5, brass #b17831, ink #173f46 | Palatino display; Geist Sans body; Geist Mono captions | Editorial text beside a closer oblique vessel plate; station index below; stacked plate on mobile | The vessel becomes a fieldwork object the Visitor can inspect at a more intimate scale |

Plan critique: a generic tropical-island or dashboard treatment would weaken the scientific premise. These studies instead derive their identity from open water, a working vessel, physical buoys, and an observation notebook. The three compositions change hierarchy and camera, not just color. Typeface rendering uses system serif faces, so appearance may vary across devices; a final font asset decision remains open.

## Evidence boundary

The positions are explicitly schematic and are not Abrolhos coordinates, bathymetry, or observed station locations. There are no synthetic measurements, organism models, live readings, or fabricated scientific charts. Station titles, sequence, copy, boat geometry, and movement are provisional visual aids. The reading panel distinguishes the fictional wrapper and links the map's selected [Duarte et al. event source](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.00179/full).

## Feasibility and limits

This uses direct Three.js for a disposable art-direction study; it does not settle the implementation-stack decision. [WebGLRenderer](https://threejs.org/docs/pages/WebGLRenderer.html) supplies WebGL 2 rendering; [ShaderMaterial](https://threejs.org/docs/pages/ShaderMaterial.html) supplies procedural opaque water. A vertex wave mesh and analytic highlights avoid asset downloads, live reflections, transparency layers, postprocessing, and dynamic shadows. Rendering DPR is capped at 1.5 for this study; this is not an adaptive quality system or a validated budget.

Reduced-motion preference stops ambient motion and moves the vessel instantly between selections. A failed WebGL context leaves the HTML station index and reading panels available. These are only minimal prototype provisions, not the map's final editorial fallback. The scene does not include real navigation physics, geography, approved station information architecture, loading/recovery design, asset production, or performance qualification.

The destination of this Wayfinder map is a specification. Nothing from this branch should be promoted to production before its separate implementation work.

## Review prompts

### Captured views

These captures use reduced motion for a stable frame. Open the development prototype to judge motion and controls.

| Study | Desktop, 1440 × 1000 | Mobile, 390 × 844 viewport |
| --- | --- | --- |
| A — Mar aberto | [Desktop](ocean-visual-language/variant-A-desktop.png) | [Mobile](ocean-visual-language/variant-A-mobile.png) |
| B — Carta viva | [Desktop](ocean-visual-language/variant-B-desktop.png) | [Mobile](ocean-visual-language/variant-B-mobile.png) |
| C — Caderno de bordo | [Desktop](ocean-visual-language/variant-C-desktop.png) | [Mobile](ocean-visual-language/variant-C-mobile.png) |

### Verification

- `bun run lint`, `bun x tsc --noEmit`, and `git diff --check` pass.
- Headless installed Chrome renders all three studies at both viewport sizes without horizontal overflow; no browser or shader errors were observed in the comparison run.
- Browser spot checks confirm button/keyboard variant wraparound, URL reload, station selection, reading-panel open/Escape close, and pause state.
- With WebGL 2 deliberately unavailable, the station index and reading panel remain usable.
- These checks do not validate frame-rate budgets, five-minute stability, physical target phones, or the final accessible editorial experience. No production build or deployment is part of this study.

### Human decision

- Which world feels right for the fictional research initiative?
- Which camera preserves both ocean scale and vessel legibility?
- Which type and information hierarchy should survive into the specification?
- If combining studies, name the base direction and the specific elements to borrow.

These prompts were used for the completed review. The decision and its boundaries live in the linked resolution comment; the map indexes that decision. The asset-inventory question continues in [Define the visual asset inventory and sourcing strategy](https://github.com/danielluis07/ocean-drive/issues/14).
