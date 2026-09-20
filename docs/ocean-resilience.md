# Ocean quality and resilience

Implements [#27](https://github.com/danielluis07/ocean-drive/issues/27) and the
navy daylight retune in [#41](https://github.com/danielluis07/ocean-drive/issues/41),
using the quality and transition contracts approved in #13, #18, and #20.

The renderer-independent quality controller consumes measured frame intervals
only while the 3D voyage is visible, after readiness. Preparation, open Sheets,
editorial presentation, hidden documents, and app switches discard partial windows
and consecutive evidence. The first frame after a return anchors time without
advancing simulation. Frame measurements remain uncapped; simulation steps are
capped at 50 ms. React receives quality updates only when the settings change.

| Tier | DPR ceiling range | Presentation |
| --- | --- | --- |
| High | 1.25–1.5 | Navy water, moving wind whitecaps, fine ripples and glints, a 48-point wake trail, 160 water subdivisions |
| Balanced | 1.0–1.25 | Navy water, moving wind whitecaps and glints, a 32-point wake trail, 120 water subdivisions |
| Low | 0.75–1.0 | Same navy daylight, two ripple layers and subdued glints, an eight-point foam wake, 48 water subdivisions, low vessel LOD; no wind whitecaps |

Effective DPR never exceeds the device's raw DPR. All tiers use canvas antialiasing
and omit shadow maps, live scene reflections, and post-processing. A small local
sky texture is prefiltered once at High/Balanced into an environment render target for the vessel's
paint, glass, and metal, and rebuilt after context restoration. Its GPU handles
are released during context loss so cleanup cannot invalidate the restored frame.
Low retains no environment target. Water uses analytic wind-wave normals,
deep navy absorption with crest scattering, roughened Fresnel sky shading,
wind whitecaps, patches of sun highlights, and a soft hull contact shadow
in a single surface pass. Low runs at the browser's cadence;
the optional 30 Hz cap is not enabled. Device hints select Balanced for desktop or
Low for coarse pointers/small screens once; subsequent changes use measurements.

Two-second p90 windows above 20 ms must occur three times consecutively before
degradation. Resolution is the last thing the ocean gives up: first drop effects
by one tier, keeping the sharpness the scene already has; only once the water is
as plain as it gets does DPR step down, 1.25 to 1 to 0.75. A blurred ocean is more
conspicuous than a calmer one, and a passage keeps the wake shader busy from Stop
to Stop, so pressure lasts as long as the sailing does. Promotions require ten consecutive active
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
0.25 device scale and a touch-capable context (so Low) for the software renderer
while preserving CSS viewports and input coordinates. It sets these as fixture
values, so every spec file that uses it gets them, not only the first one loaded.
These runs cannot serve as full-resolution performance evidence.
Low uses a short eight-point foam trail and compiles out the detailed wake
slopes, bow wave, clouds, and fine ripple calculations. The Ship follows the
same long swells as the water; reduced motion runs wave time at 30% speed and
swell height and ripple slopes at 45% strength, quiets glints and whitecaps,
disables pitch and roll, and clears the wake on placement. The shoreline uses
the same time and strength, with its travelling breakers held still.
Its texture is embedded in the
same-origin GLB. Regenerate both detail levels with `bun run assets:ship`.
These are behavioral checks in Chromium with software rendering;
physical-device performance and release acceptance remain unvalidated.

## Surface detail and renderer timing

Secondary normal layers cross the dominant wind direction at ±60 degrees to
break up the brushed-metal grain. Reflections and Fresnel use a softened normal,
the water body scatters a little light, and sun glints stay below clipping, so the
surface does not read as a mirror of the sky. Wave scales, strengths, distance fading, and
the analytic wave layers retain the original OceanX-inspired treatment. Validate the appearance
using matching camera, viewport, and wave time, including the upper/right water
and the reduced-quality mobile view.

## Navy daylight and shoreline contract

`lib/ocean-daylight.ts` reads `--ocean-950` and `--ocean-050` from the Canvas's
inherited CSS tokens once on mount. Three converts these sRGB colours to linear
light. The water body, crest scattering, whitecaps, wake, surf, background,
hemisphere light, directional light, and local sky environment derive their
colours from that pair. One high sun at `[-25, 88, -40]` supplies the directional
light, analytic glints, and environment highlight throughout Stops 00–04.
There are no per-Stop lighting changes. The scene fog and shader haze share the
navy colour and the 140–420 world-unit distance range; the water and surf use a
smooth haze transition. Baseline shader recovery uses the same navy body and haze.

High/Balanced wind whitecaps use the existing ripple slopes and foam noise,
concentrating broken white flecks on steep swell crests even when the Ship rests.
They need no new noise octaves, textures, geometry, or render passes. Specular
glints broaden as waves become smaller than a pixel to reduce aliasing. Low
uses a finer second ripple layer and 45% glint intensity to break up broad
metallic highlights on portrait screens. It compiles out the whitecaps together
with the detailed wake and additional ripple layers.
The existing grid sizes, wake point counts, DPR controller, one ocean draw,
and retained-target budget (one at High/Balanced, zero at Low) are unchanged.

For a Landmark or another mesh that must meet the water:

1. Include `oceanSwellShader` from `lib/ocean-surface.ts` in its vertex shader.
   Pass the **same** `time` (simulation seconds) and `waveStrength` uniforms as
   the ocean: strength `1` normally, `CALM_WAVE_STRENGTH` for reduced motion.
   Call `swell(world.xz, height, slope)` after transforming to world coordinates,
   then add `height` to world Y. Do not scale the returned height a second time.
   CPU buoyancy uses `sampleOceanHeight(x, z, time, waveStrength)`.
2. `createSurfMaterial(daylight)` in `lib/landmark-surf.ts` is the ready-made
   shoreline implementation. Its flat band has UV `u` in world-unit arc length
   along the shore, and `v` from zero at the coast to one at the outer edge.
   The band adds a 0.03 world-unit clearance over the displaced surface.
3. Use `oceanDaylightUniforms(daylight)` and `oceanDaylightShader` for the shared
   linear-light colours and `oceanHaze(colour, worldPosition)`. Apply Three's
   tone-mapping and colour-space chunks once at fragment output.
4. Share one surf material across Landmarks, draw it after the opaque ocean
   (`renderOrder = 1`), enable transparency, and disable depth writes. The surf
   adds one draw per visible island and no render target. Update its clock and
   strength with the ocean; set its `motion` uniform to zero for reduced motion.
   The band works at every tier and survives decorative-water shader fallback.

`tests/browser/ocean-daylight.e2e.ts` compiles and draws all three tiers with a
Landmark visible, reads the actual GPU uniforms to check the shared foam colour,
wave strength and time, checks reduced-motion timing and route-independent sun,
and asserts scene draw/triangle/target budgets. It saves normal and calm images.
The High case earns promotion through the production quality controller.
`tests/ocean-surface.test.ts` measures reduced buoyancy displacement and vertical
travel across all five anchorages. Run these alongside the resilience suite.
Browser clocks and reduced render resolution make these deterministic functional
checks, not frame-time measurements. Non-regression on the reference physical
laptop and phone still requires matched before/after release measurements.

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

## Ship wake

`lib/ship-wake.ts` records the Ship's wake as a trail of world-space points,
laid more sparsely the faster the Ship sails. Each point keeps its birth time and
the Ship's smoothed speed, thrust, and rate of turn as it passed, and the newest
points are uploaded as uniform arrays every frame. The water shader treats each
segment as a source of divergent Kelvin crests that spread outward with age, at
an angle that narrows for fast hulls, plus faint transverse crests and a lane of
prop wash. The wash flattens the wind ripples, is thrown outward in turns, and
tears from dense churn into lace as it ages. Overlapping segments take the
strongest contribution rather than summing, and crests fade past each segment's
ends, so joints and a Ship doubling back leave no seams. The wake stays where it
was made and dissipates over nine seconds. A resting Ship lays no new water, and
a cut, such as a chapter jump or a reduced-motion Stop change, clears the trail.

A bounding box of the water the trail can still disturb lets pixels outside it
skip the per-segment loop, so a settled Ship adds no wake cost. Around the hull,
a bow wave and broken water along the sides follow the direction of travel and
grow with speed. The hull squats as it drives, lifts its bow when accelerating,
dips it when braking, and heels outward in turns. Reduced motion keeps the hull
level.
