# 3D ocean performance envelope

Research date: 2026-09-04  
Decision ticket: [Establish the feasible 3D ocean performance envelope](https://github.com/danielluis07/ocean-drive/issues/2)

## Decision

The aerial ocean experience is feasible on ordinary recent mid-range laptops and phones if the ocean is treated as a stylized GPU shader, not a physically simulated body of water. The compatibility baseline should be WebGL 2, with an opaque, camera-centered surface, vertex-shader waves, sampled or procedural normals, analytic Fresnel/specular lighting, and no live planar reflection in the default path. Rendering resolution must be capped and adjusted from measured frame time. WebGPU may be explored later as an enhancement, but it should not be required for the main experience because it is still not Baseline across widely used browsers.

The safest creative constraint is useful: from a high aerial camera, large-scale motion, color, foam accents, sun glints, and the boat wake carry the illusion. Refraction, transparent depth, screen-space reflection, and a high-resolution mirrored scene are comparatively expensive and are not needed to make this viewpoint convincing.

This conclusion is evidence-backed at the technique level, but no browser documentation can guarantee a frame rate for a category as broad as “mid-range devices from the last three years.” The numeric budgets below are starting acceptance thresholds for a prototype and must be validated on representative physical devices before the visual direction is locked.

## Evidence behind the decision

### Compatibility baseline

- Current Three.js `WebGLRenderer` uses WebGL 2 and no longer supports WebGL 1. It exposes pixel-ratio control, asynchronous shader compilation, render statistics, shadow-update control, and a `failIfMajorPerformanceCaveat` option. These are the controls this project needs for a broad, observable baseline. [Three.js `WebGLRenderer` documentation](https://threejs.org/docs/pages/WebGLRenderer.html)
- A browser returns `null` when the requested canvas context is unsupported. WebGL context creation also accepts `failIfMajorPerformanceCaveat`, which lets the user agent refuse a context when performance would be poor or no hardware GPU is available. This gives the implementation an explicit route into the editorial fallback. [MDN: `HTMLCanvasElement.getContext()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext)
- WebGPU offers more modern GPU access, but MDN currently marks it “Limited availability” rather than Baseline. It also requires a secure context. It is therefore unsuitable as the only renderer for a public portfolio piece today. [MDN: WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)

**Recommendation:** implement against WebGL 2 first. Keep the ocean material isolated enough to port later, but do not carry two renderers in the first release.

### Why some water techniques are risky

The official Three.js `Water` add-on demonstrates the principal trap. Its fragment shader samples the normal texture four times, samples a mirror texture, computes lighting and Fresnel reflectance, and participates in shadowing. More importantly, its `onBeforeRender` callback renders the scene again from a mirror camera into a render target before the main render. The source itself states that increasing the reflection texture size is more expensive. [Three.js `Water.js` source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js)

That makes planar reflection approximately an additional scene submission plus its render-target pixel cost, not a small water-only embellishment. A refraction pass or screen-space post-processing would add further full-screen/render-target work. For an ocean that occupies most of an aerial view, fragment shading and memory bandwidth scale with the drawing-buffer area: doubling pixel ratio in both dimensions creates four times as many pixels; a device pixel ratio of 3 creates nine times the pixels of DPR 1 at the same CSS size.

Mozilla’s current WebGL guidance explicitly recommends a smaller back buffer as a quality/performance trade, batching draw calls, preferring vertex-shader work, mipmapping textures seen in 3D, avoiding blocking API calls, budgeting VRAM per pixel, and using compressed textures because texture bandwidth is precious on mobile. It also warns against assuming float render-target support across mobile systems. [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)

**Recommendation:**

- Keep the water opaque and render it in the normal scene pass.
- Use 2–4 broad vertex-wave components and 1–2 normal/noise samples for moving surface detail. Compute sun glint, Fresnel-like edge response, depth-color approximation, and sparse foam analytically in the water material.
- Use a static or slowly changing environment/sky representation for reflections. Do not ship per-frame planar reflection, refraction, SSR, simulation render targets, or FFT water in the default tiers.
- If a later prototype shows planar reflection is essential, make it an experimental high-tier-only feature, render only selected objects into a 256–512 px target, and update it less frequently than the main frame. It still must pass the same sustained-device tests.

### Dominant costs in this composition

| Cost | Why it dominates here | Control |
| --- | --- | --- |
| Drawing-buffer pixels and water fragment shader | The water covers most of the screen; DPR multiplies shaded pixels quadratically. Every full-screen post effect repeats much of that work. | Cap DPR, adapt render scale first, keep water opaque, avoid stacked post-processing. |
| Extra scene/render-target passes | Planar reflection in the official `Water` source performs another scene render before the main pass. Shadows and post-processing likewise add passes. | Use analytic/static reflection; bake or fake shadows; allow at most one cheap high-tier post effect after measurement. |
| Texture bandwidth and VRAM | Animated normals, environment maps, props, and render targets remain resident and are sampled continuously; mobile bandwidth is constrained. | KTX2/Basis for suitable color textures, mipmaps, restrained dimensions, no unused HDR/float targets, a measured per-pixel VRAM budget. |
| Draw calls and scene traversal | Field Stations, markers, foam, birds, debris, and vegetation can create CPU/driver overhead even when geometry is modest. | Merge static scenery by material, instance repeated props, cull distant content, and use LOD. Three.js states that `InstancedMesh` reduces draw calls, and `LOD` switches meshes by distance. [Three.js `InstancedMesh`](https://threejs.org/docs/pages/InstancedMesh.html), [Three.js `LOD`](https://threejs.org/docs/pages/LOD.html) |
| JavaScript, React, layout, and input | A stable GPU frame can still miss its deadline if per-frame state updates cause component renders, allocations, physics work, or layout. | Keep boat/camera simulation in the render loop, mutate render state without per-frame React reconciliation, reuse objects, keep information panels in accessible HTML, and profile the whole main thread. |
| Thermal/battery pressure | A continuously animated full-screen canvas is a sustained workload, especially on phones. Initial benchmark results may not represent minute three. | Validate a full five-minute journey, start phones conservatively, pause when hidden, and retain a user-selectable reduced-quality/editorial route. |

KTX2 is a practical asset path because the Three.js loader detects supported GPU compression and transcodes Basis Universal textures to a supported compressed format. [Three.js `KTX2Loader`](https://threejs.org/docs/pages/KTX2Loader.html)

## Proposed quality ladder

These are implementation starting points, not claims that a particular device will meet them. Render scale means the effective pixel ratio supplied to the renderer, capped independently of the operating system’s DPR.

| Tier | Intended state | Starting render scale | Ocean | Scene and effects | Frame target |
| --- | --- | --- | --- | --- | --- |
| High | Sustained headroom demonstrated | 1.25–1.5, never raw uncapped DPR | 4 wave components; 2 normal/noise samples; analytic sky/specular; richer wake and foam | LOD high; one measured, cheap post effect permitted; one static/frozen shadow map if it earns its cost | 60 Hz / 16.7 ms frame interval |
| Balanced | Default for laptops; promotion target on stronger phones | 1.0–1.25 | 3 wave components; 2 samples; analytic sky/specular; simplified wake | LOD medium; no live reflections; no dynamic shadows; no full-screen post by default | 60 Hz preferred; degrade before sustained intervals exceed 20 ms |
| Low | Default for phones and recovery tier | 0.75–1.0 | 2 wave components; 1 sample or low-frequency procedural normal; limited foam | Aggressive LOD/culling; no reflection target, shadows, transparency, or post; optional 30 Hz render cadence with time-based movement | Stable 30 Hz / 33.3 ms interval |
| Editorial | Accessibility or capability fallback | No continuously animated canvas | Still ocean artwork or CSS treatment | The same Expedition, Field Stations, facts, and CTA in semantic HTML with simple or no transition | No 3D frame target |

Suggested prototype ceilings at Balanced are one ocean draw call, fewer than 100 total visible draw calls, fewer than 150,000 visible triangles, and no more than one off-screen render target. These are deliberately conservative hypotheses, not standards. `renderer.info` exposes calls, triangles, programs, geometries, and textures, so they are easy to record and revise from evidence. [Three.js `WebGLRenderer.info`](https://threejs.org/docs/pages/WebGLRenderer.html)

Geometry should be camera-centered and bounded rather than a literal enormous ocean. A regular grid or concentric LOD rings can place vertices where they matter on screen while the shader derives waves from world coordinates, preserving the appearance of travel. CPU code should update only the boat, camera, interaction targets, and sparse wake state; it should not rewrite the ocean’s vertices each frame.

## Runtime adaptation and fallback thresholds

Do not select a permanent tier from user-agent strings or reported core counts. Start conservatively, measure the actual experience, and use hysteresis so quality does not oscillate.

1. Before loading the heavy 3D scene, route directly to Editorial when `prefers-reduced-motion: reduce` matches. The W3C definition says this preference asks the system to remove or replace non-essential motion, including motion that can cause vestibular discomfort or distraction. Offer an explicit “Enable 3D journey” choice rather than preventing access permanently. [W3C Media Queries Level 5: `prefers-reduced-motion`](https://www.w3.org/TR/mediaqueries-5/#prefers-reduced-motion)
2. Route to Editorial when WebGL 2 context/renderer creation returns `null`, emits `webglcontextcreationerror`, or is refused with `failIfMajorPerformanceCaveat: true`. Provide a manual “Try 3D anyway” path that recreates once without that flag if desired; the story and CTA must never depend on success.
3. Start at Low on coarse-pointer/small-screen devices and Balanced elsewhere. Treat that only as a cautious initial choice, not a capability verdict.
4. After shader compilation and asset upload, collect frame intervals only while `document.visibilityState === "visible"` and while the user is not blocked on loading. `requestAnimationFrame` is normally paused in background tabs, so hidden intervals must not trigger degradation. Use its timestamp for time-based motion. [MDN: `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
5. Evaluate rolling two-second windows. If the 90th-percentile interval is above 20 ms for three consecutive windows, lower one tier, reducing render scale first. Promote only after at least ten seconds with the 90th percentile below 14 ms and no long loading/input stalls. Wait at least ten seconds between tier changes.
6. At Low, aim for an intentional 30 Hz canvas cadence. If its 90th-percentile visible frame interval remains above 33.3 ms for three consecutive windows after warm-up, stop the canvas and offer Editorial with a one-click retry. This threshold means even the minimum 30 Hz experience cannot be sustained; it is a project acceptance rule, not a browser guarantee.
7. On `webglcontextlost`, immediately preserve navigation/content state and show the Editorial representation while the renderer attempts recovery. If restoration fails or context loss occurs twice in one visit, remain in Editorial. Browsers expose dedicated context-lost/restored events, and context loss can result from excess GPU demand, GPU switching, or reset. [MDN: `webglcontextlost`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event), [MDN: `isContextLost()`](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/isContextLost)
8. Always expose a visible quality control: Auto, Reduced 3D, and Text/Still version. User choice overrides automatic promotion.

For diagnostics, frame intervals reveal user-visible smoothness and `renderer.info` reveals scene submission. When available in development, `EXT_disjoint_timer_query_webgl2` can measure GPU command duration without stalling the rendering pipeline; because the extension is not Baseline, instrumentation must remain optional. [MDN: `EXT_disjoint_timer_query`](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query)

## Acceptance test required before visual lock

The water decision becomes implementation-safe only after a representative prototype contains the final camera angle, ocean screen coverage, one Field Station, the boat and wake, an information panel, and representative asset loading. Test the complete five-minute intended journey, not an empty-scene counter.

Use current stable Safari on a base recent iPhone, current stable Chrome on at least two recent mid-range Android devices, and current Chrome/Firefox/Safari on laptops with integrated graphics. A useful concrete lab set would include an iPhone 15/16-class device, Pixel 8a-class Android, Galaxy A55/A56-class Android, an integrated Intel or AMD Windows laptop, and a base Apple-silicon MacBook Air. Exact models are procurement choices, not technical requirements; record browser, OS, viewport, effective DPR, initial/final tier, frame-interval percentiles, context loss, peak texture/geometry counts, and subjective thermal behavior.

Acceptance criteria:

- Balanced sustains a 90th-percentile frame interval at or below 20 ms through the five-minute laptop run.
- Low sustains a 90th-percentile interval at or below 33.3 ms through the five-minute phone run.
- Steering input, camera motion, and HTML information remain responsive during streaming and tier changes.
- No test device loses its WebGL context or exceeds a device-specific VRAM budget established from the prototype. Mozilla recommends deriving VRAM allowance per pixel from measured target systems rather than assuming a portable absolute amount. [MDN: per-pixel VRAM budgeting](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices#estimate_a_per-pixel_vram_budget)
- Reduced-motion, failed-context, persistent-low-frame-rate, and context-loss routes all preserve the same content and CTA in Editorial.
- The site pauses simulation/render work when hidden and resumes without a time-step jump.

## Implications for later decisions

- Water should be art-directed around the inexpensive cues above. If the concept requires mirror-perfect landmarks, underwater refraction, or physically interacting waves, the mobile promise must be reconsidered or those features must be reserved for an opt-in high tier.
- The information layer should be semantic HTML above/beside the canvas. Besides accessibility, this prevents text clarity and layout from being tied to render scale.
- The non-3D experience is a first-class presentation of the same fictional marine Expedition, not an error page and not a recorded video.
- The final renderer/library choice should expose render scale, scene statistics, context events, asset disposal, LOD/instancing, and custom shader control. Three.js satisfies those needs; this research does not require committing the project to React Three Fiber or any particular React integration.

## Primary sources

- [Three.js: `WebGLRenderer`](https://threejs.org/docs/pages/WebGLRenderer.html)
- [Three.js: `Water.js` source](https://github.com/mrdoob/three.js/blob/dev/examples/jsm/objects/Water.js)
- [Three.js: `InstancedMesh`](https://threejs.org/docs/pages/InstancedMesh.html)
- [Three.js: `LOD`](https://threejs.org/docs/pages/LOD.html)
- [Three.js: `KTX2Loader`](https://threejs.org/docs/pages/KTX2Loader.html)
- [React Three Fiber: scaling performance](https://r3f.docs.pmnd.rs/advanced/scaling-performance)
- [MDN: WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [MDN: `HTMLCanvasElement.getContext()`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext)
- [MDN: WebGPU API](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API)
- [MDN: `requestAnimationFrame`](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN: WebGL context loss](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/webglcontextlost_event)
- [MDN: `EXT_disjoint_timer_query`](https://developer.mozilla.org/en-US/docs/Web/API/EXT_disjoint_timer_query)
- [W3C: Media Queries Level 5](https://www.w3.org/TR/mediaqueries-5/)

