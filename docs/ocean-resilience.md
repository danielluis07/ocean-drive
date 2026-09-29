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
| High | 1.25–1.5 | Navy water, moving wind whitecaps, fine ripples and glints, a 48-point wake trail drawn through a 512² wake field, 160 water subdivisions |
| Balanced | 1.0–1.25 | Navy water, moving wind whitecaps and glints, a 32-point wake trail drawn through a 448² wake field, 120 water subdivisions |
| Low | 0.75–1.0 | Same navy daylight, two ripple layers and subdued glints, an eight-point foam wake, 48 water subdivisions, low vessel LOD; no wind whitecaps |

Effective DPR never exceeds the device's raw DPR. All tiers use canvas antialiasing
and omit shadow maps, live scene reflections, and post-processing. A small local
sky texture is prefiltered once at High/Balanced into an environment render target for the vessel's
paint, glass, and metal, and rebuilt after context restoration. Its GPU handles
are released during context loss so cleanup cannot invalidate the restored frame.
High/Balanced retain one more target, the wake field (see [Wake field](#wake-field)),
rebuilt and released the same way. Low retains neither. Water uses analytic wind-wave normals,
deep navy absorption with crest scattering, roughened Fresnel sky shading,
wind whitecaps, patches of sun highlights, and a soft hull contact shadow
in a single surface pass. Low runs at the browser's cadence;
the optional 30 Hz cap is not enabled. The starting tier comes from the device
(see [Starting tier](#starting-tier)); subsequent changes use measurements.

Where the browser exposes `EXT_disjoint_timer_query_webgl2`, the ocean's render
is wrapped in a `TIME_ELAPSED_EXT` query from a ring of four ([#53](https://github.com/danielluis07/ocean-drive/issues/53)).
Results are polled a few frames late without stalling, and discarded when
`GPU_DISJOINT_EXT` is set or when they span a pause. No draw call or render target
is added. The query also covers the wake field pass, which is part of the ocean's
cost. Like render targets, the ring is released while a lost context is still
lost: deleting its queries after restoration raised `INVALID_OPERATION`, which
failed the restored frame's validation and kept the Visitor in text mode. A window with GPU times for at least half of its frames is judged on GPU
p90, because frame intervals alone cannot tell an idle GPU waiting on vsync from one
barely making it, and they also carry main-thread stalls the ocean did not cause.
The budget is the most whole refresh intervals that fit 20 ms (16.7 ms at 60 Hz,
13.9 ms at 144 Hz), with the refresh interval read from the window's fastest
frames. A window is slow when GPU p90 exceeds 90% of that budget, and fast when it
stays below 60% of one refresh interval. Without the extension (Safari, some
Firefox builds, many phones), or with too few samples, the frame-interval rules
below decide unchanged. The unusable-Low lock always reads frame intervals.

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

## Starting tier

Implements [#54](https://github.com/danielluis07/ocean-drive/issues/54). The
controller should start where the device will settle, so the Visitor never
watches the first passage downgrade the water. `lib/starting-tier.ts` picks the
start from three signals, most trusted first; live measurement stays
authoritative after all of them, so a wrong start is still corrected either way.

1. **Remembered result.** Once the controller has held a tier and DPR for 15
   active seconds without an automatic change (and quality is automatic), that
   pair is stored in `localStorage` under a key derived from the device. The
   next visit on the same device starts there directly and skips the warm-up.
   Changing screen size or DPR (zoom) gives a new key. A malformed entry, or
   storage that throws on access or on write, is ignored: the visit starts as a
   first visit.
2. **Warm-up benchmark.** On a first visit, once the ocean is ready while the
   Approach still covers it, the scene renders a synthetic full-length wake at
   cruise (`cruiseWake` in `lib/ship-wake.ts`: every one of the 48 trail slots
   live, the bow wave at full speed) for up to a second. These frames go to the
   controller's warm-up only, never to its live windows. The warm-up decides only
   on GPU timer queries (at least 20 timed frames covering half the frames):
   frame intervals behind a loading screen are vsync-bound and cannot say how
   close to the budget the GPU is. From the measured tier's GPU p90 it predicts
   the others with a per-pixel cost prior (Low 1, Balanced 2.5, High 3.75,
   scaled by DPR²) and picks the highest tier predicted within 75% of the
   vsync-snapped budget. Under pressure (measured p90 above 90% of the budget) it
   only moves down, keeping the current DPR; otherwise it only moves up, taking
   the new tier's DPR ceiling. The move starts no cooldown. The cost prior is
   conservative until the per-feature cost table of #57 replaces it.
   The warm-up runs only while at least 1.2 s of the Approach's 2.5 s minimum read
   time remain, and stops 0.8 s before it ends, so a changed tier recompiles
   while the Approach still shows. It never extends the Approach: when the ocean
   is ready too late, there is no warm-up. It renders the existing scene, wake
   field included, with different uniforms, so it adds no draw call and no render
   target at any tier; Low still retains none. Opening a Sheet, hiding the page, or leaving 3D
   interrupts it without a verdict; it may run again if enough read time is left.
3. **Coarse GPU class.** The renderer string sorts obvious cases: Intel HD/UHD/Iris,
   Radeon Vega 3–11 and Radeon(TM) Graphics APUs, Mali-G1x–G5x, Adreno 1xx–5xx and
   PowerVR are *modest*; GeForce RTX, Radeon RX 5000–9000 and Apple M-series
   Pro/Max/Ultra are *capable*. A modest GPU starts on Low at Balanced's DPR
   ceiling, which is where the controller took the reference Vega 10 laptop after
   its first passage; on a handheld it starts on Low's own ceiling. A capable GPU
   starts on High, except on a coarse-pointer or small screen, which keeps the
   handheld default. Masked or generic strings ("WebKit WebGL", "Apple GPU",
   Firefox's resist-fingerprinting "Mozilla"), unknown GPUs, and software
   renderers give no class. Software rendering never reaches a Visitor, since
   the eligibility probe sets `failIfMajorPerformanceCaveat`; leaving it
   unclassified also keeps the SwiftShader browser suites on today's defaults.
   The class is only a prior: it never locks 3D or opens text mode. Only three
   measured Low windows above 33.3 ms can.

With no remembered result, a masked renderer, and no GPU timing, the start is
exactly the device hints above: Balanced for desktop, Low for coarse pointers
and small screens. The source picked is recorded in local diagnostics as
`starting-quality` (`remembered`, `gpu-class` or `default`), and the warm-up's
outcome as `warm-up`; neither records the renderer string.

### Privacy

The renderer string is a fingerprinting surface. It is read once, in the
eligibility probe, and used only on the page to pick a tier. Chrome masks the
plain `RENDERER` parameter, so `WEBGL_debug_renderer_info` is requested only
when that parameter reads "WebKit WebGL"; Firefox's plain string is used
as is, which also avoids its deprecation warning for the extension. The string
is never sent anywhere, never written to diagnostics, and never stored: the
storage key is `ocean-drive:quality:` followed by a 32-bit FNV-1a hash of the
renderer, screen size and DPR together, and the stored value holds only the
tier and DPR.

`tests/starting-tier.test.ts` covers the classes, the masked-renderer path,
the key hashing, throwing and malformed storage, and the order of the signals;
`tests/ocean-quality.test.ts` covers the warm-up verdicts and settling.

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
The existing grid sizes, wake point counts, DPR controller, and one ocean draw
are unchanged. The retained-target budget rose from one to two at High/Balanced
for the wake field ([#55](https://github.com/danielluis07/ocean-drive/issues/55));
Low still retains none.

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
skip the wake entirely, so a settled Ship adds no wake cost. Around the hull,
a bow wave and broken water along the sides follow the direction of travel and
grow with speed. The hull squats as it drives, lifts its bow when accelerating,
dips it when braking, and heels outward in turns. Reduced motion keeps the hull
level.

### Wake field

Implements [#55](https://github.com/danielluis07/ocean-drive/issues/55). The
water used to walk every trail segment at every pixel inside that box: 31
segments at Balanced and 47 at High, many of them evaluated in full because an
aging wake's crests reach far. Its cost was trail length times covered screen,
so it peaked during and just after passages, exactly when the Balanced → Low
downgrade fired on the reference Vega 10 laptop.

At High and Balanced, `lib/wake-field.ts` now keeps a square of water 448 world
units a side (512² texels at High, 448² at Balanced, RGBA8) that follows the
Ship. Its origin snaps to whole texels, so it stays anchored to the water rather
than swimming with the Ship. The heaviest wake, High's full trail laid at cruise
and left to age out, disturbs at most about 410 units across, so the whole wake
fits at every tier; if the water ever outgrows the field, the field keeps the 96
units around the Ship. Each frame one quad over the disturbed water (a single
draw into the field) ranks, per texel, the four segments whose crests, wash or
slick reach it most strongly, and writes their indices. It judges the world noise
that bends the arms at its worst and pads by half a texel's diagonal, so no pixel
misses a segment it can see. Segments under 1% strength, or under a tenth of the
strongest there, are left out. The water weighs crests by the square of their
strength, so these change nothing visible.

The water shader reads one texel and runs the unchanged per-segment code for at
most those four segments, strongest first, stopping at the first empty slot.
Kelvin-arm phase, foam tearing, turn bias and the strongest-wins blending are
therefore computed exactly as before, per pixel and from the same uniforms. The
field only chooses which segments to evaluate. The field pass is part of the
decorative water: a shader failure there falls back to baseline water like the
water's own, and baseline water draws no field. Low keeps its eight-point loop
and no field.

Context loss releases the field's handles while the context is lost; restoration
rebuilds it and clears the trail (`ShipWake.forget`), so the restored ocean starts
without a wake. Reduced motion still places the Ship every frame, which clears
the trail; a placed Ship has no energy, so the field names no segment.

Measured on the reference AMD Radeon RX Vega 10 (Chrome, ANGLE/D3D11, 1903×790
drawing buffer at Balanced, 2283×948 at High). This used a standalone harness
that renders only the water with the warm-up's cruise wake held at a fixed age
and interleaves the old and new shaders. The figures are median GPU milliseconds
per render; the minimum is in brackets.

| Wake | Balanced before | Balanced after | High before | High after |
| --- | --- | --- | --- | --- |
| None (settled) | 9.6 (7.4) | 9.4 (7.8) | 19.4 (6.5) | 19.5 (6.8) |
| Under way (cruise) | 14.8 (11.9) | 9.7 (8.4) | 43.5 (19.4) | 22.8 (9.2) |
| Stopped 2 s ago | 26.4 (22.8) | 13.0 (11.1) | 54.0 (47.4) | 26.5 (18.8) |
| Stopped 4 s ago | 35.3 (29.6) | 15.5 (12.6) | 73.0 (61.6) | 29.9 (23.7) |
| Stopped 7 s ago | 47.8 (41.7) | 12.5 (11.5) | 90.4 (72.0) | 22.8 (9.8) |

At Balanced, a passage now costs within about 8% of settled water (by minimum),
and the widest aging wake stays well inside a 16.7 ms frame. Of what remains, the
field pass itself takes 0.3–1 ms. GPU clocks on this shared iGPU vary widely
under light load, hence the gap between median and minimum. Captures of both
shaders at the same state differ by at most 3 of 255 levels for straight and
turning wakes. A Ship backing along its own trail differs in 0.05–0.06% of
pixels, where more than four segments overlap.
