# Ocean quality and resilience

Implements [#27](https://github.com/danielluis07/ocean-drive/issues/27), using
the quality and transition contracts approved in #13, #18, and #20.

The renderer-independent quality controller consumes measured frame intervals
only while the 3D voyage is visible, after readiness. Preparation, readers,
editorial presentation, hidden documents, and app switches discard partial windows
and consecutive evidence. The first frame after a return anchors time without
advancing simulation. Frame measurements remain uncapped; simulation steps are
capped at 50 ms. React receives quality updates only when the settings change.

| Tier | DPR ceiling range | Presentation |
| --- | --- | --- |
| High | 1.25–1.5 | Fine surface ripples and richer foam, 160 water subdivisions |
| Balanced | 1.0–1.25 | Reflective wave shading and a broken foam wake, 120 water subdivisions |
| Low | 0.75–1.0 | Simplified reflective wave shading, 48 water subdivisions, low vessel LOD |

Effective DPR never exceeds the device's raw DPR. All tiers use canvas antialiasing
and omit shadow maps, live scene reflections, and post-processing. A small local
sky texture is prefiltered once into an environment render target for the vessel's
paint, glass, and metal, and rebuilt after context restoration. Its GPU handles
are released during context loss so cleanup cannot invalidate the restored frame.
Water uses analytic wind-wave normals, deep navy absorption with crest scattering,
roughened Fresnel sky shading, restrained patches of sun highlights, and a soft hull contact shadow
in a single surface pass. Low runs at the browser's cadence;
the optional 30 Hz cap is not enabled. Device hints select Balanced for desktop or
Low for coarse pointers/small screens once; subsequent changes use measurements.

Two-second p90 windows above 20 ms must occur three times consecutively before
degradation. First reduce DPR to the current tier's lower ceiling; if pressure
continues, drop effects by one tier. Promotions require ten consecutive active
seconds below 14 ms. Automatic changes are at least ten active seconds apart.
Three consecutive Low windows above 33.3 ms lock 3D and open the preserved text
presentation, including during cooldown. Quality is always automatic since #36:
the Visitor has no quality control. The stored preference remains in Voyage State
only so the production gate can defer the lazy runtime; it never clears failure locks.

The first context loss records the Ship's place on the route and opens the
Accessible Editorial Presentation with a one-line explanation. The original
canvas stays mounted for one restoration attempt. Native browser restoration and
the context-loss extension converge on recompilation and valid-frame readiness.
An eight-second foreground recovery deadline covers absent restoration events or
stalled preparation; hiding or switching apps pauses that deadline. Readiness only
offers an explicit “Voltar ao oceano”. Failed recovery, an interrupted recovery across reload,
or a second loss locks 3D for the visit. The loss count and availability survive
restart and tab-scoped persistence, with backward-compatible loading of v1 saves.

The initial vessel, working renderer, baseline ocean, controls, and semantic
connected route input gate readiness. Optional vessel LOD requests retain the usable
vessel while delayed or failed. Decorative water shader failure retries once with
baseline water; baseline/essential
shader failure opens text. Identity uses inline geometry and adjacent text;
fonts already have CSS/system substitutes. Neither identity nor fonts adds a
graphics readiness dependency. Low never changes the route, the Stops, or input.

Deterministic tests cover timing thresholds, cooldowns, preference and pause
behavior, persistence, real WebGL loss/restoration events, recovery timeout,
shader failures, optional fonts/LOD failures, lifecycle events, and Low fallback.
Browser timing uses a controlled clock where real elapsed time would make results
ambiguous, including the existing navigation journeys: software rendering on the
test host can cross the mandatory fallback threshold. A dedicated slow-frame
browser scenario still verifies that threshold with the production controller.
The journey fixture advances ten individual 16 ms frames per round-trip and uses
0.5 device scale for the software renderer while preserving CSS viewports and
input coordinates. These runs cannot serve as full-resolution performance evidence.
Low compiles out foam, wake deformation, clouds, and fine ripple calculations.
The vessel follows the same long swells as the water; reduced motion freezes wave
time and disables pitch and roll. No new external textures or asset services are
required. Regenerate both vessel detail levels with `bun run assets:vessels`.
These are behavioral checks in Chromium with software rendering;
physical-device performance and release acceptance remain unvalidated.

## Surface detail and renderer timing

Secondary normal layers cross the dominant wind direction at ±60 degrees to
break up the brushed-metal grain. Reflections and Fresnel use a softened normal,
the water body scatters a little light, and sun glints stay below clipping, so the
surface does not read as a mirror of the sky. Wave scales, strengths, distance fading, and
lighting follow the original OceanX-inspired treatment. Validate the appearance
using matching camera, viewport, and wave time, including the upper/right water
and the reduced-quality mobile view.

Fiber 9.7.0 still constructs the deprecated `THREE.Clock` in its root store
([upstream issue](https://github.com/pmndrs/react-three-fiber/issues/3741)). A
version-pinned Bun patch replaces that construction with a `THREE.Timer` adapter
in the development, production, and ESM entry points. It preserves Fiber 9's
mutable `elapsedTime`, seconds-based deltas, and start/stop behavior. The existing
application lifecycle remains responsible for visibility and pausing. No console
warnings are suppressed. Bun reapplies the patch on installation; review/remove
it when upgrading Fiber to a release with native Timer support.

`bun test tests/fiber-clock.test.ts` checks actual root creation and frame-mode
timing. The browser entry test checks the warning through the bundled Canvas;
the resilience suite checks pause, resume, context restoration, and fallback.
