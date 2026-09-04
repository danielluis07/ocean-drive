# Web 3D stack comparison for Ocean Drive

Research date: 2026-09-04

## Question and project constraints

Which web 3D stack is viable for a stylized, aerial ocean expedition in this repository, which currently uses Next.js 16.3.4, React 19.2.8, TypeScript, and Bun? The experience must support forgiving boat control, informational HTML, an adapted mobile presentation, and an editorial fallback. It should run on ordinary recent laptops and phones, so water and other expensive effects must be able to degrade independently.

This report compares three credible choices:

1. Three.js directly.
2. Three.js through React Three Fiber (R3F), with selective use of Drei.
3. Babylon.js, either imperatively or through `react-babylonjs`.

It narrows the candidates but does **not** make the final architecture decision. That decision should follow a small representative prototype and human review.

## Findings that apply to every stack

### Next.js boundary

The 3D runtime belongs behind a narrow Client Component boundary. In the exact Next.js docs installed with this repository, a Client Component still renders on the server during an initial request; the name means that its code also ships to and runs in the browser. Browser-only libraries therefore need either server-safe initialization or a client-side `next/dynamic` wrapper with `ssr: false`. Next.js only permits that option inside a Client Component. Everything imported below a `'use client'` entry joins the client module graph, so the boundary should wrap the canvas rather than the whole page. This leaves headings, expedition content, metadata, fallback navigation, and loading/error UI as ordinary server-renderable HTML ([Next.js server/client boundary](https://nextjs.org/docs/app/guides/server-and-client-boundary), [Next.js lazy loading](https://nextjs.org/docs/app/guides/lazy-loading), [Next.js browser-only rendering](https://nextjs.org/docs/app/guides/single-page-applications#rendering-components-only-in-the-browser)).

This was checked against the local 16.3.4 guides at `node_modules/next/dist/docs/01-app/02-guides/server-and-client-boundary.md`, `lazy-loading.md`, and `single-page-applications.md`, not inferred from older Next.js conventions.

Recommended framework shape, independent of renderer:

- A Server Component page owns meaningful Portuguese content and the accessible/editorial fallback.
- A small Client Component dynamically loads the canvas runtime and reports loading, failure, and quality state back to DOM UI.
- Only serializable scene configuration crosses the server/client boundary; live renderer objects and callbacks stay inside the client subtree.
- Models, textures, compressed texture transcoders, and decoder files are static deployable assets. None of the three engines intrinsically requires a Node server, edge runtime, or special hosting service.

### Accessibility is an HTML architecture concern

A WebGL/WebGPU canvas does not turn meshes into a useful semantic document. Pointer picking, engine GUI controls, or a scene-specific accessibility helper can improve operation, but they should not be the sole representation of expedition content. The primary navigation controls, station names, progress, content panels, and fallback route should remain native HTML with keyboard focus and screen-reader semantics. The canvas can be decorative or progressively enhanced from that content model.

R3F exposes raycast-based pointer events, including click, wheel, pointer capture, and configurable event computation, but its event model is explicitly different from DOM propagation and currently does not support multiple active pointer captures ([R3F events](https://r3f.docs.pmnd.rs/api/events)). The separate `@react-three/a11y` package emulates focus, roles, keyboard activation, and announcements, but its published package metadata still declares only broad `react >=18` and `@react-three/fiber >=8` peers and its repository has open Next.js, Strict Mode, touch, and HTML-performance issues. It is not strong enough evidence to replace the DOM fallback in this React 19.2 project ([package source](https://github.com/pmndrs/react-three-a11y/blob/main/package.json), [open issues](https://github.com/pmndrs/react-three-a11y/issues)).

### Renderer choice will not solve water performance by itself

The dominant costs will be the chosen water technique, render resolution, overdraw, reflection/refraction passes, post-processing, shadow maps, texture memory, and scene complexity—not whether the scene graph was declared in JSX. All three candidates can start from a low-subdivision plane displaced in a vertex shader with stylized fragment color/normals. FFT/fluid simulation, planar reflections, high device-pixel ratio, and layered transparency should not be baseline assumptions. The architecture should expose a quality policy that can independently change device-pixel ratio, water material complexity, reflection frequency/resolution, shadows, particles, and post-processing. A separate water prototype should determine those tiers on representative hardware.

WebGL 2 is the safe first production baseline for that prototype. WebGPU remains an optional branch:

- Three.js `WebGPURenderer` automatically uses WebGPU when available and falls back to a WebGL 2 backend, but the official migration guide says `ShaderMaterial`, `RawShaderMaterial`, and `onBeforeCompile()` modifications are not supported. That is a material constraint for custom stylized water ([Three.js WebGPU renderer guide](https://threejs.org/manual/en/webgpurenderer)).
- Babylon.js has maintained WebGL and WebGPU side by side since Babylon.js 5. Its WebGPU engine initialization is asynchronous; official guidance checks support and creates a WebGL engine when WebGPU initialization is unavailable ([Babylon.js WebGPU support](https://github.com/BabylonJS/Documentation/blob/master/content/setup/support/webGPU.md), [WebGPU differences and fallback example](https://github.com/BabylonJS/Documentation/blob/master/content/setup/support/webGPU/webGPUBreakingChanges.md)).

WebGPU should therefore be treated as a future optimization or separately proven renderer path, not a prerequisite for viability.

## Option 1: Three.js directly

### Fit

Three.js is the smallest conceptual layer: application code constructs and disposes the renderer, scene, cameras, geometry, materials, loaders, controls, raycaster, resize handling, and animation loop. Core has no runtime dependencies on npm, while controls, glTF loading, and post-processing live as separately imported official addons ([Three.js package](https://www.npmjs.com/package/three), [Three.js installation and addons](https://threejs.org/manual/en/installation.html)).

This is genuinely viable in React 19 because Three.js does not depend on React. A canvas-owning Client Component can create the scene in an effect, keep mutable simulation state outside React rendering, and dispose all GPU resources and listeners in cleanup. React can continue to own the surrounding HTML UI.

### Strengths

- Maximum control over the frame loop, object lifetime, shader implementation, and imports.
- No custom React renderer or React-version coupling.
- Straightforward escape route for low-level renderer experiments and custom water shaders.
- Official `LoadingManager` tracks start, progress, completion, errors, and aborting where supported; `GLTFLoader` supports Draco and KTX2 integrations ([LoadingManager](https://threejs.org/docs/pages/LoadingManager.html), [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html)).
- Official controls and `Raycaster` cover camera input and mesh picking without another framework ([OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [Raycaster](https://threejs.org/docs/pages/Raycaster.html)). The boat's top-down movement is specialized enough that a small custom input/simulation layer is likely preferable to a stock orbit controller.

### Costs and risks

- React synchronization, cleanup, resize behavior, loading states, resource reuse, scene composition, and hot-reload correctness become project-owned infrastructure.
- Imperative scene construction is less naturally decomposed into the React component vocabulary already used by the site.
- It is easy to accidentally allocate per frame, duplicate loaded resources, leave event listeners attached, or leak GPU resources.
- The lower dependency count does not guarantee a smaller production chunk. The actual result depends on imported Three.js modules/addons and application code, and must be measured from the Next.js build output.

### Maintenance implication

Direct Three.js minimizes adapter maintenance but maximizes local integration code. It is attractive if the prototype proves that custom renderer or shader control dominates the project, or if the team already has strong imperative Three.js expertise.

## Option 2: React Three Fiber plus selective Drei

### Fit

R3F is a React renderer for Three.js: it maps JSX scene elements to Three.js objects and provides a shared render loop, lifecycle/disposal behavior, pointer events, hooks, and Suspense-aware loading. The official compatibility matrix pairs R3F v9 with React 19. More specifically, R3F 9.5.0 added support for React 19.2, and current R3F 9.7.0 declares React and React DOM peers from 19.0 up to (but excluding) 19.3 ([R3F installation](https://r3f.docs.pmnd.rs/getting-started/installation), [R3F releases](https://github.com/pmndrs/react-three-fiber/releases), [R3F package source](https://github.com/pmndrs/react-three-fiber/blob/master/packages/fiber/package.json)). This directly covers the repository's React 19.2.8 version; an implementation should pin a v9 version at or above 9.5 rather than accepting an older v9 lock accidentally. R3F v10 is currently alpha and should not be a launch dependency.

Drei is a separate helper collection, not a requirement. Its current package has 21 direct dependencies, so imports should be feature-by-feature and the resulting chunks measured rather than treating the whole ecosystem as free ([Drei package](https://www.npmjs.com/package/%40react-three/drei)).

### Strengths

- Scene ownership and composition align with the existing React application, while refs and `useFrame` preserve imperative access for per-frame simulation.
- `useLoader` uses React Suspense, caches by URL, supports parallel and preloaded assets, and exposes loaded glTF nodes/materials. Drei adds `useGLTF`, HTML loaders, and progress helpers ([R3F hooks](https://r3f.docs.pmnd.rs/api/hooks), [R3F model loading](https://r3f.docs.pmnd.rs/tutorials/loading-models)).
- R3F pointer events remove routine raycasting glue and integrate mesh events into a component tree.
- R3F supports `always`, `demand`, and `never` frame-loop modes. Ocean Drive will animate continuously while sailing, but the loop can pause or switch behavior when hidden, in editorial fallback, or at static states ([R3F hooks](https://r3f.docs.pmnd.rs/api/hooks)).
- Drei's `PerformanceMonitor` measures averaged frame rate and exposes incline, decline, gradual factor, and fallback callbacks. That maps well to adaptive DPR and effect tiers, though project-owned policy is still needed ([Drei PerformanceMonitor](https://drei.docs.pmnd.rs/performances/performance-monitor)).
- Three.js APIs remain accessible; R3F's v9 guide supports supplying a renderer callback, including an async renderer, so renderer experiments are not categorically blocked ([R3F v9 migration guide](https://r3f.docs.pmnd.rs/tutorials/v9-migration-guide)).

### Costs and risks

- R3F adds a custom reconciler plus ten current direct dependencies; Drei adds considerably more. This increases install surface, client code, and coordinated-version maintenance compared with direct Three.js ([R3F package dependencies](https://www.npmjs.com/package/%40react-three/fiber?activeTab=dependencies), [Drei package](https://www.npmjs.com/package/%40react-three/drei?activetab=dependencies)).
- React minor changes can affect the reconciler. The R3F maintainers had to bundle a compatible reconciler to support React 19.0 through 19.2, so exact React/R3F compatibility should be checked during upgrades ([R3F 9.5.0 release](https://github.com/pmndrs/react-three-fiber/releases)).
- Declarative code does not excuse per-frame React state updates. R3F's official guidance says frame callbacks should stay slim and should not call `setState`; mutable simulation belongs in refs or an external store ([R3F hooks](https://r3f.docs.pmnd.rs/api/hooks), [performance pitfalls](https://r3f.docs.pmnd.rs/advanced/pitfalls)).
- Convenience abstractions can hide extra render passes. Water, reflections, environments, shadows, and post-processing still need explicit profiling.
- R3F's own Canvas source documentation describes its WebGPU integration as work in progress, and stable v9 does not erase the Three.js WebGPU material limitations. WebGPU/TSL should remain an experiment rather than the default renderer ([R3F Canvas source documentation](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/canvas.mdx)).
- Accessibility still requires the parallel DOM content/control layer described above.

### Maintenance implication

R3F reduces project-owned React/Three integration and offers the strongest ready-made path for loading, lifecycle, interaction, and adaptive quality in this React codebase. The cost is dependency/reconciler coupling. Selective Drei usage is important: use helpers only when they remove meaningful code, and inspect production chunks after each major visual feature.

## Option 3: Babylon.js

### Fit

Babylon.js is a fuller engine with cameras/input, loaders, GUI, materials, physics and WebGPU/WebGL engines under one project. Its npm packages are typed ES modules and support individual imports for tree shaking ([`@babylonjs/core` package](https://www.npmjs.com/package/%40babylonjs/core)). The engine can be owned imperatively by a Client Component, which avoids any React compatibility dependency.

The community `react-babylonjs` adapter is also viable on paper: current 4.x explicitly requires React 19, provides a declarative scene API and hooks, and has one direct runtime dependency (`react-reconciler`) in addition to peer engine packages ([react-babylonjs repository](https://github.com/brianzinn/react-babylonjs), [react-babylonjs package](https://www.npmjs.com/package/react-babylonjs?activeTab=dependencies)). It is not maintained in the official BabylonJS organization and has a much smaller adoption footprint than R3F, so it should be evaluated as a separate dependency decision rather than assumed with Babylon.js.

### Strengths

- A broad, integrated engine can reduce assembly work if the experience grows toward game-like systems.
- WebGL and WebGPU implementations are maintained side by side, with an official async initialization/fallback pattern.
- Current loader guidance supports glTF/GLB and dynamically imports only the needed file-type importer. Module-level loading functions supersede the legacy `SceneLoader` class specifically for better tree shaking ([Babylon.js file loading](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/importers/loadingFileTypes.md)).
- `AssetContainer` can hold loaded nodes, materials, textures, and other assets outside the active scene, which is useful for staged station loading/unloading ([Babylon.js AssetContainer](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/importers/assetContainers.md)).
- Direct Babylon.js use is insulated from React renderer changes, just like direct Three.js.

### Costs and risks

- Ocean Drive currently needs a focused visual experience, not a general game engine. Babylon's breadth may add concepts and code that the project does not use.
- Tree shaking depends on disciplined ESM/module-level imports and should be verified in Next.js output; broad legacy imports intentionally pull much more of the engine.
- Using Babylon imperatively recreates the React lifecycle/integration burden of direct Three.js. Using `react-babylonjs` adds reconciler coupling through a smaller community adapter.
- Babylon's engine GUI is still rendered into the graphics experience; it does not remove the need for semantic HTML content and controls.
- Choosing Babylon would give up the much larger R3F/Drei ecosystem for React-oriented scene composition without an evident Ocean Drive requirement that compensates for that switch.

### Maintenance implication

Babylon.js is technically credible, especially if a later prototype uncovers a need for its integrated engine facilities or its WebGPU implementation. It is not the default shortlist leader for the current brief because the project is React-centered and narrowly scoped, while the declarative Babylon adapter has a materially smaller ecosystem.

## Side-by-side decision matrix

| Concern | Three.js directly | R3F + selective Drei | Babylon.js |
| --- | --- | --- | --- |
| React 19.2.8 | Independent of React; manual effect lifecycle | Explicit support in R3F >=9.5; best React composition | Direct engine is independent; `react-babylonjs` 4.x says React 19 |
| Next.js boundary | Browser canvas in a narrow Client Component; usually client-only init | Same; `<Canvas>` subtree is client code | Same for either imperative engine or adapter |
| Loading | Official loaders + `LoadingManager`; manual React state | Cached Suspense `useLoader`/`useGLTF`, preload and progress helpers | Dynamic loader registration and `AssetContainer` staging |
| Controls/events | Manual input + official controls/raycasting | R3F pointer events and hooks; custom boat simulation still needed | Integrated camera/input facilities; custom boat simulation still needed |
| Accessible content | Parallel native HTML required | Parallel native HTML required; a11y helper is supplemental | Parallel native HTML required |
| Bundle surface | Fewest framework layers; measure actual imports | Adds reconciler/dependencies; selective Drei and lazy chunk required | Broad engine; disciplined module imports/tree-shaking required |
| Resource lifecycle | Entirely project-owned | R3F manages common object lifecycle, with escape hatches | Project-owned imperatively; adapter can declaratively manage it |
| WebGPU posture | New renderer has automatic WebGL 2 backend but custom shader limitations | Inherits Three.js; async custom renderer possible, ecosystem compatibility must be proven | Mature parallel engine, explicit async selection/fallback |
| Ecosystem/maintenance | Largest low-level Three ecosystem; more local glue | Strong React/Three ecosystem; coordinated React/reconciler versions | Strong engine project; much smaller community React adapter |

## Justified shortlist for the architecture decision

### Leading candidate: R3F v9 + Three.js, with selective Drei

This is the best candidate to prototype first because its current supported line explicitly matches React 19.2, it fits the existing React component model, and it removes substantial lifecycle, loading, picking, and adaptive-performance plumbing. It does not prevent direct use of Three.js objects or custom shader materials. The prototype should keep the 3D subtree client-only, keep narrative UI in HTML, pin compatible versions, and import only the Drei helpers actually used.

### Control candidate: Three.js directly

Keep direct Three.js as the comparison/control implementation. It is the better choice if a representative prototype shows that R3F's reconciler/dependencies complicate Next.js, that the water renderer needs lower-level ownership, or that the team is materially more productive with imperative Three.js. It is also the clean fallback if future React minor upgrades temporarily outpace R3F compatibility.

### Conditional candidate: Babylon.js directly

Babylon.js remains viable, but should advance only if the prototype or product specification identifies an engine-level need that it clearly serves better—such as a Babylon-specific water/material path, integrated game facilities, or a proven WebGPU advantage on target devices. If evaluated, start with direct Babylon.js inside a Client Component; treating the smaller `react-babylonjs` adapter as mandatory would combine the breadth of Babylon with another reconciler dependency without demonstrated benefit.

## What the prototype must answer before a human decides

Use the same representative slice for the leading and control candidates rather than generic spinning-cube demos:

1. An aerial camera, controllable boat, bounded ocean, and one station marker.
2. One desktop control scheme and one touch scheme feeding the same simulation state.
3. A persistent HTML information panel and keyboard-operable station navigation.
4. A low-cost stylized water material plus one higher tier; WebGL 2 first.
5. At least one compressed GLB and texture-loading transition.
6. Quality adaptation across DPR, reflections, shadows, and post-processing.
7. Measurements on representative mid-range phone and laptop hardware: initial route JS, asset bytes, time to useful HTML, time to interactive canvas, steady-state FPS/frame time, GPU memory warning/context loss, and recovery/fallback behavior.

Do not pick the stack from package unpacked sizes or a desktop-only FPS snapshot. Compare production Next.js chunks and the same scene/assets, because dependency count and package archive size do not directly equal shipped JavaScript or rendering cost.

## Conclusion

The concept is viable without betting on WebGPU. The evidence supports an R3F-v9/Three.js prototype first and a direct-Three implementation as the meaningful control. Babylon.js is real and capable, but conditional rather than the strongest fit for this narrowly scoped React experience. In every option, a small client-only graphics island, a durable semantic HTML layer, adaptive visual tiers, and measured water prototypes matter more than the engine label.
