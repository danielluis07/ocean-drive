# Ocean and vessel experience — throwaway navigation study

Decision ticket: [Validate the core ocean-and-vessel experience](https://github.com/danielluis07/ocean-drive/issues/10).

Status: awaiting human review. This is a primary-source prototype for a planning decision, not production implementation or an approved architecture.

## Run

```sh
bun install
bun run prototype
```

Open http://localhost:3002/?variant=A. From the original checkout, run `bun --cwd .prototypes/ocean-vessel-experience run prototype`.

The server listens on all interfaces so a phone on the same network can open the computer's LAN address on port 3002, subject to the computer's firewall. No deployment is required. The full prototype lives on the throwaway `prototype/ocean-vessel-experience` branch.

## Question and scope

Can the selected Mar aberto ocean, working vessel, heading-coupled camera, Guided Helm, Environmental Wayfinding, and adaptive quality support a readable, distinctive Expedition on desktop and portrait mobile?

The earlier art-direction decision is fixed. Three camera compositions on the existing root route explore the remaining question, rather than reopening the art direction. The prototype skill's comparison bar therefore changes framing within the approved visual language. It preserves position, heading, progress, and quality when switching.

| Camera | Composition | Question |
| --- | --- | --- |
| A — Mar aberto | Broad aerial trailing perspective with mild turn lag | Does ocean scale coexist with a legible vessel and destination? |
| B — Leitura das águas | Higher, more vertical survey perspective | Does greater awareness of surrounding water justify the smaller vessel? |
| C — Perto do convés | Lower, closer trailing perspective | Does a more tangible vessel justify the reduced view of other stations? |

The bottom arrows switch `?variant=A`, `B`, and `C`. Left/right keyboard arrows steer the vessel except when focus is inside the comparison bar, where they switch cameras. This preserves the accepted keyboard control contract. The comparison bar and inspector are development-only.

## Design plan

The subject is a Visitor retracing the evidence chain of the 2019 Abrolhos event through Instituto Maré Aberta's fictional Expedition. The page's job is to make guiding a working vessel toward visible research buoys feel understandable and worthwhile.

Palette: petroleum `#093b48`, jade `#348c91`, mist `#dceceb`, buoy ochre `#ecc180`, and salt `#edf5f1`. Geist Sans carries institutional identity and the invitation; Georgia italic emphasizes the poetic phrase; Geist Mono identifies stations and study measurements. The signature is a small ivory-decked working vessel tracing a curved wake across open water. Quiet HTML typography frames that scene.

Desktop places the invitation at the left, leaving the center to the vessel and destination. Portrait uses a shorter opening and a higher camera with a longer forward view. When the two middle stations first unlock, the camera rises and widens to expose both choices; portrait labels use a narrower footprint. After the short opening, the water becomes the main visual field. The station approach brings up a plain reading panel; it is a navigation placeholder, not a proposed solution to the separate information-presentation ticket.

Plan critique: the previous art study's clickable station index and automatic travel conflict with the later navigation decision. They are omitted here. Names are attached to physical buoys, input changes heading, and destinations unlock without changing the vessel's course. There are no charts, minimaps, telemetry readouts, or organism illustrations presented as scientific evidence.

## What to try

1. Begin moving immediately. Drag horizontally on the water, or hold A/D or Left/Right. Release and observe that the resulting heading remains while forward travel continues.
2. Approach Pulso de Calor. The visible approach ring accepts an approximate approach, slows the vessel, and opens the reading panel. Motion and steering pause. Finish both short pages and choose Continuar expedição.
3. Corais sob Estresse and Respostas Desiguais become available together. Sail to them in either order. Their stable positions persist through camera, renderer, quality, and viewport changes.
4. After the three evidence stations, sail deliberately to Convergência and complete its two-page synthesis. Expedição conectada appears in the world. Completed stations can be revisited.
5. Sail away or circle in already visited water. Watch for more emphatic beacons, then Reorientar rota. That action changes heading and gives control back immediately. The visibly banded outer current curves the vessel inward.
6. Open Controles, enable semantic steering buttons, and use their pointer or keyboard press-and-hold behavior. Page controls do not capture helm keys.
7. Switch tabs and return. Retomar expedição is required. Resize or rotate; the current gesture cancels while position, heading, and completed stations remain.
8. Open Versão em texto. The four narrative summaries remain available independently of WebGL. Reduced-motion preference starts here automatically.

## Rendering comparison and measurement

The inspector switches `?engine=r3f` (React Three Fiber 9) and `?engine=three` (direct Three.js). Both render the same Three.js scene, materials, geometry, camera calculations, input model, label projection, and simulation. R3F uses Canvas/useFrame with an imperative scene group; the control uses WebGLRenderer/setAnimationLoop. This isolates integration and loop behavior. It does **not** compare a fully declarative R3F scene architecture, establish bundle-size parity, or lock a production stack.

The heavy scene loads inside a client-only dynamic boundary. Simulation updates are imperative; the HTML inspector samples the external model at 5 Hz. Two prototype files explicitly exempt this external simulation from the React immutability lint rule. There is no persistent store, backend, scientific data fetching, or animation library.

The implementation follows the local Next.js client-boundary/lazy-loading documentation and the primary [R3F hooks documentation](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/hooks.mdx) and [Canvas documentation](https://github.com/pmndrs/react-three-fiber/blob/master/docs/API/canvas.mdx).

| Tier | Maximum DPR | Water segments per side | Secondary surface detail | Wake samples |
| --- | --- | --- | --- | --- |
| High | 1.5 | 180 | Full | 70 |
| Balanced, initial | 1.15 | 112 | Reduced | 48 |
| Low | 0.8 | 64 | Off | 28 |

Water is opaque with vertex displacement and analytic highlights. There are no live planar reflections/refractions, dynamic shadows, postprocessing, downloaded 3D assets, or WebGPU requirement. GPU allocations for water tiers are cached and disposed when the scene unmounts.

The inspector reports actual mean FPS, p90 animation-frame interval, DPR, draw calls, and triangles. Five-second windows exclude hidden/paused/reading time and gaps above 500 ms. Two consecutive windows above 33.3 ms lower one tier; six below 19 ms raise one tier. Two slow windows while already at Low open the editorial view. Manual tier selection freezes adaptation for comparison. These thresholds and exclusions are hypotheses, not an acceptance budget or GPU timing measurement.

Exportar observação downloads the current parameters, latest window, viewport, browser, state, and in-memory wake history as JSON. It is a session snapshot, not a five-minute trace or a physical-device certification. Switching renderer resets the active timing window; cold-start and steady-state comparisons should be collected separately on the same hardware.

## Calibration parameters and limits

- Speed: 3.1 world units/second; maximum turn rate: 0.62 radians/second, with an input ramp. Desktop/touch drag dead zones are 18/14 CSS px, and displacement ranges differ. All are provisional.
- Approach radii: 7.5 units desktop, 9 portrait, with a 1.2-second departure grace. Departure suppression prevents immediate reopening until the vessel leaves the approach area.
- Assistance samples progress every four active seconds. Sustained worsening distance, circling in visited water, and boundary contact can escalate; fresh-water exploration and progress reset it. Eight/sixteen seconds of qualifying non-progress increase signals/offer reorientation. These are deliberately inspectable heuristics, not validated detection thresholds.
- The boundary current appears around an 87-unit radius centered on the shared waters. Its maximum turn contribution exceeds manual turn rate, ensuring recovery without a hard wall.
- Initial travel and short placeholder reading are intentionally faster than final editorial content. The three-to-five-minute human journey has not been validated.
- A single lost WebGL context opens the text version in this cheap study. Production context retry, loading transitions, detailed reduced-motion 3D behavior, source-presentation design, and final accessibility semantics belong to their existing decision tickets.
- R3F 9.7.0 with Three.js 0.185.1 emits an upstream `THREE.Clock` deprecation warning. The prototype does not use Clock directly or modify dependency internals. Review that compatibility detail before locking the production stack.
- The three evidence station summaries paraphrase already accepted narrative decisions. They are explicitly provisional, contain no invented measurements, and link the selected [Duarte et al. paper](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.00179/full). The institute, vessel, station names, positions, and route are fictional. Coordinates are not Abrolhos geography.

## Human review and physical devices

Judge A/B/C on the ease of seeing the Research Vessel, anticipating a turn, finding the next buoy, and choosing between the two middle stations. Report whether the helm feels too slow, too sensitive, or hard to recover, and whether the ocean retains the desired scale. On mobile, also check one-handed touch, rotation, label readability, and browser-edge gestures.

A human verdict and physical target-device runs are still required. At minimum, record device model, OS, browser, viewport/orientation, renderer, tier transitions, performance after five minutes, and any thermal or control deterioration. A desktop browser at a phone viewport cannot establish touch comfort, phone GPU throughput, or thermal stability.

No decision is recorded on the map until the live review resolves this ticket. The prototype branch remains outside main; nothing here is approved for production promotion.

## Captured views and verification

The captures below are development-browser observations of the live prototype. Use the running page to judge steering and motion.

| Camera | Desktop, 1440 × 1000 | Portrait, 390 × 844 |
| --- | --- | --- |
| A — Mar aberto | [Desktop](ocean-vessel-experience/A-desktop.png) | [Portrait](ocean-vessel-experience/A-mobile.png) |
| B — Leitura das águas | [Desktop](ocean-vessel-experience/B-desktop.png) | [Portrait](ocean-vessel-experience/B-mobile.png) |
| C — Perto do convés | [Desktop](ocean-vessel-experience/C-desktop.png) | [Portrait](ocean-vessel-experience/C-mobile.png) |

Additional observations: [both middle destinations visible on portrait](ocean-vessel-experience/mobile-route-choice.png), [station reading](ocean-vessel-experience/station-desktop.png), [Connected Expedition](ocean-vessel-experience/connected-desktop.png), and [editorial fallback](ocean-vessel-experience/editorial-mobile.png).

Browser checks used installed headless Chrome, with real pointer/keyboard input and emulated touch through Chrome's input protocol. They exercised:

- A/B/C rendering on desktop and portrait, reload-stable camera URLs, and no horizontal overflow; landscape rotation also preserved position and heading.
- Keyboard steering, unchanged heading after release while position continues advancing, touch drag/release, and focusable semantic steering buttons.
- A complete route through Pulso de Calor → Respostas Desiguais → Corais sob Estresse → Convergência. Position stayed fixed during each reading panel; the middle stations unlocked together, and completion waited for Convergence arrival and deliberate narrative exit.
- Camera and renderer changes without resetting the vessel; actual geometry and DPR changes when selecting Low/High quality; pause/resume and a text-to-ocean round trip with working controls.
- Reduced motion showing all four HTML summaries with no canvas; deliberately unavailable WebGL showing the same summaries; a context-loss event opening the fallback.
- An artificial 42 ms of main-thread work per animation frame causing adaptation to Low and then the text fallback. This verifies the policy path only, not a phone performance budget.

`bun run lint`, `bun x tsc --noEmit`, and `git diff --check` are the source checks. No automated test suite, production build, deployment, physical-device qualification, or human acceptance verdict is part of these browser observations. Ordinary walkthroughs reported no browser or shader errors; the upstream Clock warning is noted above. Background-tab behavior has an explicit visibility handler and resume control, but actual OS suspension and mobile browser lifecycle behavior remain for device testing.
