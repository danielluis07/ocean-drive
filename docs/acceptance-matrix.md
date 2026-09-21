<!-- Generated from content/acceptance-matrix.ts by `bun run acceptance:matrix`. Edit the source, then regenerate. -->

# Production Acceptance Matrix

The observable criteria, target states, methods, required evidence, and pass thresholds for one exact Travessia release candidate. It implements [#45](https://github.com/danielluis07/ocean-drive/issues/45), replacing the Instituto Maré Aberta matrix of [#19](https://github.com/danielluis07/ocean-drive/issues/19). [release-dossier.md](release-dossier.md) describes how evidence is recorded and evaluated.

## Evidence rules

- Every row records **Pass**, **Fail**, or **Unvalidated**. Missing evidence is Unvalidated and never counts as a pass.
- Evidence counts only when it names the exact 40-character candidate commit. Evidence for another commit, from a working tree that differed from the commit, or from a filtered or interrupted run is rejected.
- Evidence is stale, and rejected, when it predates the candidate commit or is older than 30 days when the dossier is generated; evidence dated in the future is rejected too.
- Evidence must be verifiable: every cited file must exist and still match its recorded SHA-256, and a cited JSON file that names a candidate (such as a local diagnostic export) must name the same one.
- The latest acceptable record for each check or capture point decides it; superseded records stay in the dossier's history.
- A row passes only when every check and capture point it lists passes. Any recorded Fail makes the row Fail; otherwise any missing entry leaves it Unvalidated.
- Every row is mandatory. Only rows marked cosmetic may carry a waiver, and only for a recorded Fail with the difference, impact, owner, reason, follow-up, approver, and approval date. A waiver on any other row is rejected and the row still blocks release.
- The candidate is release-ready only when every row is Pass or a waived cosmetic Fail. The project owner's verdict (R3) cannot override a blocking row.

## Summary

| Row | Title | Evidence | Waiver |
| --- | --- | --- | --- |
| A1 | Clean CI | Automated | Not waivable |
| A2 | Voyage State persistence | Automated | Not waivable |
| A3 | Charted Route input and settling | Automated | Not waivable |
| A4 | Minimal chrome and Stop Cards | Automated | Not waivable |
| A5 | Stop Account and Capítulos Sheets, and the Arrival | Automated | Not waivable |
| A6 | Reduced-motion cuts | Automated | Not waivable |
| A7 | Editorial parity and presentation switching | Automated | Not waivable |
| A8 | WebGL failure fallback and resilience | Automated | Not waivable |
| A9 | Automated accessibility | Automated | Not waivable |
| A10 | Asset provenance and reproducibility | Automated | Not waivable |
| A11 | Transfer, asset, and scene budgets | Automated | Not waivable |
| A12 | Lab Core Web Vitals | Automated | Not waivable |
| A13 | Opt-in ambient sound | Automated | Not waivable |
| B1 | Voyage walkthrough at capture points | Manual | Not waivable |
| B2 | Visual direction | Manual | Cosmetic: may be waived |
| B3 | Landmarks, Ship, and water | Manual | Not waivable |
| B4 | Ambient sound listening check | Manual | Not waivable |
| C1 | WCAG 2.2 AA conformance | Manual | Not waivable |
| C2 | Keyboard-only Voyage | Manual | Not waivable |
| C3 | Screen readers | Manual | Not waivable |
| C4 | Zoom, reflow, contrast, and text spacing | Manual | Not waivable |
| C5 | Reduced motion on real systems | Manual | Not waivable |
| C6 | Accessibility reconciliation | Manual | Not waivable |
| D1 | Portuguese copy | Manual | Not waivable |
| D2 | Evidence Boundary | Manual | Not waivable |
| D3 | Provenance and licences | Manual | Not waivable |
| E1 | Full Voyage on every device | Manual | Not waivable |
| E2 | Sustained frame budgets | Manual | Not waivable |
| E3 | Timely 3D readiness | Manual | Not waivable |
| E4 | Thermal and motion comfort | Manual | Not waivable |
| E5 | Readability and controls on real screens | Manual | Not waivable |
| E6 | Failures reproduced and retested | Manual | Not waivable |
| F1 | First-time Visitors | Manual | Not waivable |
| R1 | Technical and accessibility sign-off | Manual | Not waivable |
| R2 | Editorial sign-off | Manual | Not waivable |
| R3 | Project-owner release verdict | Manual | Not waivable |

## A · Automated checks

### A1 · Clean CI

**Criterion.** The candidate installs, checks, and builds from a clean checkout, and no step leaves an unexpected generated diff.

**Method.** GitHub Actions on a clean runner runs `bun install --frozen-lockfile`, `bun run typecheck`, `bun run lint`, `bun test`, and `bun run build`, then compares the working tree with the candidate commit, each step wrapped by `bun run evidence`.

**Required evidence.** Candidate-bound evidence records with the retained log of every command.

**Pass threshold.** Every command exits zero on a tree that matches the candidate, and the final tree, including untracked files, is unchanged.

**Waiver.** Not waivable.

**Automated evidence.** `ci/install`, `ci/typecheck`, `ci/lint`, `ci/unit-tests`, `ci/build`, `ci/generated-diff`

### A2 · Voyage State persistence

**Criterion.** Voyage State records the current Stop, Visited Stops, Voyage Complete, and the Ship's place on the Charted Route; both presentations share it; it survives reload and back/forward in the same tab and clears on “Recomeçar viagem”.

**Method.** Unit tests of transitions and tab-scoped persistence (`tests/voyage-state.test.ts`); browser journeys for reload, history, completion, restart, and reading mode across reload.

**Required evidence.** Unit-test and per-engine browser evidence records.

**Pass threshold.** Every Stop is reachable in any order; the Arrival completes the Voyage whatever has been visited; only opening a Stop Account visits a Stop; unreadable or invalid storage starts a new Voyage safely; every journey passes in every engine.

**Waiver.** Not waivable.

**Automated evidence.** `ci/unit-tests`, `e2e/chromium/charted-route`, `e2e/firefox/charted-route`, `e2e/webkit/charted-route`, `e2e/chromium/presentation-switching`, `e2e/firefox/presentation-switching`, `e2e/webkit/presentation-switching`

### A3 · Charted Route input and settling

**Criterion.** Wheel and trackpad, touch swipes, held and tapped arrow keys, PageUp/PageDown, and “Capítulos” move the Ship along the one fixed route. It calls at every Stop, settles into a Stop within reach when input stops, rests in open water otherwise, and never leaves the route.

**Method.** Unit tests of the route, motion, camera, and Landmark clearance; browser journeys for wheel, touch, held and tapped keys, docking, open water, and chapter jumps.

**Required evidence.** Unit-test and per-engine browser evidence records.

**Pass threshold.** One gesture sails at most one passage; a step moves exactly one Stop; the Ship never turns back to a Stop left behind; route input is ignored while a Sheet is open or the page is hidden; every journey passes in every engine.

**Waiver.** Not waivable.

**Automated evidence.** `ci/unit-tests`, `e2e/chromium/charted-route`, `e2e/firefox/charted-route`, `e2e/webkit/charted-route`, `e2e/chromium/sheets`, `e2e/firefox/sheets`, `e2e/webkit/sheets`

### A4 · Minimal chrome and Stop Cards

**Criterion.** Only the Travessia logo, the sound toggle, “Capítulos”, and “Modo leitura” persist over the ocean; loading is a logo fade. Stop Cards fade in when the Ship settles and out when it sails, sit clear of the Ship, its Landmark, and the chrome, and the Stop 00 “Role para navegar” cue never returns in the tab.

**Method.** Browser journeys over the chrome, card content and fading, the scroll cue across reload, announcements, and card placement.

**Required evidence.** Per-engine browser evidence records.

**Pass threshold.** No legacy control, quality selector, or preparation button; each arrival is announced once; cards stay clear at 1440×900, 844×390, 568×320, 390×844, and 320×568; every journey passes in every engine.

**Waiver.** Not waivable.

**Automated evidence.** `e2e/chromium/stop-cards`, `e2e/firefox/stop-cards`, `e2e/webkit/stop-cards`, `e2e/chromium/ocean-entry`, `e2e/firefox/ocean-entry`, `e2e/webkit/ocean-entry`

### A5 · Stop Account and Capítulos Sheets, and the Arrival

**Criterion.** “Saiba mais” opens the Stop Account as a white Sheet (right, 520px, from 48rem; bottom, 90% height, below) and records a Visited Stop. “Capítulos” lists Stops 00–04 with visited ticks and the current Stop, jumps without visiting, and offers “Modo leitura” and “Recomeçar viagem”. The Arrival's closing card opens the itinerary and restarts.

**Method.** Browser journeys over Sheet placement, content order, closing, focus, visited ticks, chapter jumps, restart, and the closing card.

**Required evidence.** Per-engine browser evidence records.

**Pass threshold.** X, Escape, and the dimmed ocean close a Sheet; focus is trapped and returned to its opener; wheel, touch, and keys never move the Ship while a Sheet is open; no personal-data field exists; every journey passes in every engine.

**Waiver.** Not waivable.

**Automated evidence.** `e2e/chromium/sheets`, `e2e/firefox/sheets`, `e2e/webkit/sheets`, `e2e/chromium/charted-route`, `e2e/firefox/charted-route`, `e2e/webkit/charted-route`

### A6 · Reduced-motion cuts

**Criterion.** A reduced-motion preference keeps the 3D voyage, cuts between Stops instead of sailing or resting in open water, calms waves and surf, disables pitch and roll, clears the wake on each cut, and moves the editorial page without animated scrolling.

**Method.** Unit tests of reduced-motion cuts, wake clearing, and calmer buoyancy; reduced-motion browser journeys for travel, chapter cuts, entry, focus movement, and the shared wave uniforms.

**Required evidence.** Unit-test and browser evidence records.

**Pass threshold.** No sailing, open-water rest, pitch, roll, or smooth scrolling under reduced motion; the preference never opens reading mode; every journey passes in every engine where it runs.

**Waiver.** Not waivable.

**Automated evidence.** `ci/unit-tests`, `e2e/chromium/charted-route`, `e2e/firefox/charted-route`, `e2e/webkit/charted-route`, `e2e/chromium/sheets`, `e2e/firefox/sheets`, `e2e/webkit/sheets`, `e2e/chromium/accessibility`, `e2e/firefox/accessibility`, `e2e/webkit/accessibility`, `e2e/chromium/ocean-daylight`

### A7 · Editorial parity and presentation switching

**Criterion.** The Accessible Editorial Presentation carries the brand, the fictional-project disclosure, every Stop Account in route order, the itinerary, and the same Voyage State. It is complete without JavaScript, and switching in either direction is atomic.

**Method.** Browser journeys switching at Stop 00, at each Stop, around every Stop Account, and at the Arrival; a no-JavaScript read of every Stop Account.

**Required evidence.** Per-engine browser evidence records.

**Pass threshold.** Switching never visits, advances, or completes; focus lands on the current Stop's heading (or the h1 at Stop 00) and on the ocean surface on return; the disclosure appears once per presentation; every Stop Account reads without JavaScript.

**Waiver.** Not waivable.

**Automated evidence.** `e2e/chromium/presentation-switching`, `e2e/firefox/presentation-switching`, `e2e/webkit/presentation-switching`, `e2e/chromium/ocean-entry`, `e2e/firefox/ocean-entry`, `e2e/webkit/ocean-entry`, `e2e/chromium/accessibility`, `e2e/firefox/accessibility`, `e2e/webkit/accessibility`

### A8 · WebGL failure fallback and resilience

**Criterion.** Missing WebGL, a refused context, essential asset or shader failure, context loss, and sustained unusable quality open the Accessible Editorial Presentation at the matching place with one explanation line. One restoration is attempted, and optional failures degrade without blocking.

**Method.** Browser journeys simulating unsupported and refused WebGL, asset and shader failures, real context loss and restoration, recovery timeouts, lifecycle pauses, and slow Low frames.

**Required evidence.** Per-engine browser evidence records.

**Pass threshold.** The explanation is announced once; “Voltar ao oceano” appears only while 3D remains available; a second loss or failed recovery locks 3D for the visit; hidden pages pause without a time-step jump; fonts and vessel detail never gate readiness.

**Waiver.** Not waivable.

**Automated evidence.** `e2e/chromium/ocean-entry`, `e2e/firefox/ocean-entry`, `e2e/webkit/ocean-entry`, `e2e/chromium/ocean-resilience`

### A9 · Automated accessibility

**Criterion.** Representative states of both presentations have no machine-detectable WCAG 2.2 A/AA violation; keyboard focus is visible, ordered, and never trapped; layouts reflow at the target viewports, 200% and 400% zoom, and increased text spacing.

**Method.** axe-core scans of loading, the opening, Stop Cards, Sheets, the Arrival, reading mode, reduced motion, and failure states; keyboard walks; layout checks.

**Required evidence.** Per-engine browser evidence records with the `axe-<state>.json` incomplete-rule reports.

**Pass threshold.** Zero axe violations; every incomplete rule is retained per state for manual classification (C6) and never counted as a pass; every journey passes in every engine.

**Waiver.** Not waivable.

**Automated evidence.** `e2e/chromium/accessibility`, `e2e/firefox/accessibility`, `e2e/webkit/accessibility`, `e2e/chromium/keyboard`, `e2e/firefox/keyboard`, `e2e/webkit/keyboard`, `e2e/chromium/layout`, `e2e/firefox/layout`, `e2e/webkit/layout`

### A10 · Asset provenance and reproducibility

**Criterion.** Every served file, font, model, image, and recorded source has an approved source, rights, proof, transformation history, and matching SHA-256; the Ship and Landmark masters regenerate byte-identically; production requests stay on the application origin and match the ledger.

**Method.** `bun run assets:audit`; regeneration of the Ship and Landmarks followed by a tree comparison; the production gate hashes every deployed request.

**Required evidence.** CI evidence records and the production budget report.

**Pass threshold.** The audit passes, regeneration leaves no diff, and no request is unregistered, failed, or hosted by a third party.

**Waiver.** Not waivable.

**Automated evidence.** `ci/asset-audit`, `ci/reproducible-assets`, `ci/unit-tests`, `e2e/production/production-assets`

### A11 · Transfer, asset, and scene budgets

**Criterion.** Production transfer and actual renderer counts for the Ship, the Landmarks, and the water stay within the approved budgets at Balanced and Low.

**Method.** The production gate measures gzip-conservative transfer and renderer draws, triangles, and retained targets; unit tests inspect the shipped Ship and Landmark GLBs; the daylight suite compiles every tier with a Landmark visible.

**Required evidence.** The production budget report, local diagnostics, and evidence records.

**Pass threshold.** Route JS ≤200 KiB; lazy 3D JS ≤350 KiB; minimum sailable ≤1.5 MiB; complete first visit ≤5 MiB; minimum-sailable authored visuals ≤500 KiB; all authored visuals ≤750 KiB; fonts ≤160 KiB; Balanced <100 draws and <150,000 triangles with one ocean draw and ≤1 retained target; Low retains no target; Ship ≤12,000 triangles and 250 KiB (Balanced), ≤4,000 and 120 KiB (Low); each Landmark ≤4,400 triangles and 76 KiB (Balanced) or ≤1,300 and 28 KiB (Low), two draws, no textures. A missing measurement fails.

**Waiver.** Not waivable.

**Automated evidence.** `ci/unit-tests`, `e2e/production/production-assets`, `e2e/chromium/ocean-daylight`

### A12 · Lab Core Web Vitals

**Criterion.** Cold-cache loads of the Visitor's default entry, followed by representative interactions (opening and closing “Capítulos”, a route key on desktop, and “Modo leitura”), meet the approved Core Web Vitals thresholds in the lab.

**Method.** `bun run test:vitals` against the production build: at least five cold-cache runs per profile, each in a fresh browser context on a hardware-accelerated renderer; mobile and desktop p75 (nearest rank) calculated separately.

**Required evidence.** The lab report with every run, both profiles, the renderer, host, and tool versions, and the p75 calculation, labelled as lab evidence.

**Pass threshold.** Mobile and desktop p75 each meet LCP ≤2.5 s, INP ≤200 ms, and CLS ≤0.1. These are lab results and are never reported as field data; runs on a software renderer are withheld and stay Unvalidated.

**Waiver.** Not waivable.

**Automated evidence.** `e2e/lab-vitals/lab-vitals`

### A13 · Opt-in ambient sound

**Criterion.** The ambient ocean and engine loop is off by default, starts only from the sound toggle, reflects its state through `aria-pressed`, and falls silent when the page is hidden or leaves the ocean scene.

**Method.** A browser journey over the default state, toggling, page visibility, and reading mode.

**Required evidence.** Per-engine browser evidence records.

**Pass threshold.** Nothing sounds before the toggle is pressed; toggling off stops the loop; a hidden page or reading mode silences it; every journey passes in every engine.

**Waiver.** Not waivable.

**Automated evidence.** `e2e/chromium/sound`, `e2e/firefox/sound`, `e2e/webkit/sound`

**Awaiting.** #42 — the ambient loop and its browser journey are not built yet. Until it lands, the row stays Unvalidated.

## B · Browser walkthroughs and visual review

### B1 · Voyage walkthrough at capture points

**Criterion.** A reviewer completes the Voyage from Stop 00 to the Arrival and back through every surface at each capture viewport.

**Method.** Manual walkthrough of the candidate's production build in current desktop Chrome, with DevTools device emulation for the phone layouts.

**Required evidence.** One screenshot per capture point listed in the checklist, and the completed checklist.

**Pass threshold.** Every checklist item holds at every viewport, with no clipped, overlapping, or unreachable element.

**Waiver.** Not waivable.

**Capture points.** `B1#desktop` Desktop browser at 1440×900; `B1#phone-portrait` Phone layout at 390×844; `B1#phone-landscape` Phone layout at 844×390

### B2 · Visual direction

**Criterion.** The candidate reads as the approved Travessia direction: a navy, near-black ocean ground, white type, one coral accent, Manrope headlines and Geist Mono labels, a near top-down camera (75–85°), almost no chrome, and white editorial Sheets, comparable in polish to the OceanX reference.

**Method.** Human comparison of the B1 capture points and the production gate's aerial screenshots with the direction in #33. Procedural water is compared by eye, not pixel by pixel.

**Required evidence.** Annotated screenshots and a signed visual review.

**Pass threshold.** The direction is recognisable at every capture point. A cosmetic difference with no effect on meaning, legibility, interaction, accessibility, or performance may carry an owner-approved waiver.

**Waiver.** Cosmetic row: a recorded Fail may carry an owner-approved waiver.

**Capture points.** `B2#desktop` Desktop (Balanced); `B2#phone` Phone (Low)

### B3 · Landmarks, Ship, and water

**Criterion.** From the route camera each Stop is recognisable by its island, with a surf line meeting the water and no floating label or beacon; the Ship reads as a detailed expedition vessel at Balanced and Low; the water keeps its navy daylight look, wake, and reduced-motion calm.

**Method.** Human review at every Stop in both tiers, with and without reduced motion.

**Required evidence.** One capture per Stop per tier and a signed review.

**Pass threshold.** Every Stop is distinguishable without text; no island floats, leaves a seam at the water, or carries a label or light; the Ship's silhouette and detail hold at both tiers; the wake follows the Ship and clears on a cut.

**Waiver.** Not waivable.

**Capture points.** `B3#desktop` Desktop (Balanced); `B3#phone` Phone (Low)

### B4 · Ambient sound listening check

**Criterion.** The ambient loop is subtle, loops without an audible seam, never plays before the Visitor opts in, and stays off after a reload unless chosen again.

**Method.** Manual listening on desktop speakers and phone headphones.

**Required evidence.** Tester notes per capture point.

**Pass threshold.** No sound before opt-in; no audible seam, clipping, or sudden volume change; the toggle's spoken state matches what is heard.

**Waiver.** Not waivable.

**Capture points.** `B4#desktop` Desktop (Balanced); `B4#phone` Phone (Low)

**Awaiting.** #42 — the ambient loop is not built yet. Until it lands, the row stays Unvalidated.

## C · Accessibility evaluation

### C1 · WCAG 2.2 AA conformance

**Criterion.** The complete Live Experience, in both presentations and every state, conforms to WCAG 2.2 Level AA.

**Method.** A WCAG-EM-style evaluation scoped to loading, Stops 00–04, Stop Cards, both Sheets, the Arrival and itinerary, reading mode, failure notices, and reduced motion, combining automated findings with knowledgeable manual review.

**Required evidence.** A success-criterion report naming states, technologies, tools, and the evaluator.

**Pass threshold.** Every applicable Level A and AA success criterion passes across the whole process; no automated score substitutes for conformance.

**Waiver.** Not waivable.

**Capture points.** `C1#evaluation` WCAG-EM-style evaluation report

### C2 · Keyboard-only Voyage

**Criterion.** Keyboard-only use reaches and operates every meaningful action in both presentations without traps or lost focus.

**Method.** Complete the 3D and editorial Voyages with Tab, Shift+Tab, Enter, Space, arrow keys, PageUp/PageDown, and Escape only.

**Required evidence.** A keystroke walkthrough and focus-order captures.

**Pass threshold.** Every action is reachable with a visible, unobscured focus indicator; order follows meaning; focus is never trapped or lost; Escape closes only the top Sheet and never changes presentation.

**Waiver.** Not waivable.

**Capture points.** `C2#3d` 3D presentation; `C2#editorial` Accessible Editorial Presentation

### C3 · Screen readers

**Criterion.** Named screen-reader and browser pairs expose correct structure, names, states, and announcements through the complete Voyage.

**Method.** Complete the critical path with each pair on a real device: arrive at every Stop, open a Stop Account, use “Capítulos”, switch presentations, reach the Arrival, and restart.

**Required evidence.** Versioned walkthrough notes or recordings per pair.

**Pass threshold.** Headings, landmarks, names, roles, values, visited and current states, progress, arrivals, Sheet titles, and failure lines are understandable; polite announcements neither steal focus nor repeat excessively.

**Waiver.** Not waivable.

**Capture points.** `C3#nvda-firefox` NVDA with Firefox on Windows; `C3#voiceover-safari-macos` VoiceOver with Safari on macOS; `C3#voiceover-safari-iphone` VoiceOver with Safari on iPhone; `C3#talkback-chrome-android` TalkBack with Chrome on Android

### C4 · Zoom, reflow, contrast, and text spacing

**Criterion.** Text, controls, Sheets, and the editorial page stay legible and operable under magnification, reflow, increased text spacing, forced colours, and larger default fonts.

**Method.** Manual checks at 200% and 400% zoom, WCAG 1.4.12 text spacing, Windows contrast themes, a larger browser font size, and a notched phone's safe areas.

**Required evidence.** Captures at each setting and computed contrast results.

**Pass threshold.** WCAG 2.2 AA contrast, reflow, and text-spacing criteria pass; focus stays visible; no essential text or action is clipped, overlapped, or hidden.

**Waiver.** Not waivable.

**Capture points.** `C4#desktop` Desktop browser; `C4#phone` Physical phone

### C5 · Reduced motion on real systems

**Criterion.** With the operating system's reduce-motion setting on, the voyage stays in 3D and remains comfortable: cuts between Stops, calm water, a level Ship, and no animated scrolling.

**Method.** Enable reduce motion on macOS or Windows and on a phone, then complete the Voyage.

**Required evidence.** Tester notes and a short recording per capture point.

**Pass threshold.** No sailing animation, pitch, roll, sliding card, or smooth scroll; reading mode does not open because of the setting; the tester reports no discomfort.

**Waiver.** Not waivable.

**Capture points.** `C5#desktop` Desktop (Balanced); `C5#phone` Phone (Low)

### C6 · Accessibility reconciliation

**Criterion.** Human review reconciles the automated scans with the keyboard, screen-reader, zoom, and motion walkthroughs and documents every limitation.

**Method.** The technical and accessibility reviewer classifies every `axe-<state>.json` incomplete result from A9 and every finding from C1–C5.

**Required evidence.** The signed accessibility section of the Release Dossier.

**Pass threshold.** No unresolved applicable finding. If no evaluation with disabled participants took place, that limitation is recorded as an unvalidated risk and the experience is not described as user-validated by people with disabilities.

**Waiver.** Not waivable.

**Capture points.** `C6#reconciliation` Accessibility reconciliation

## D · Copy, Evidence Boundary, and provenance review

### D1 · Portuguese copy

**Criterion.** Every visitor-facing string is correct, calm, brief Brazilian Portuguese in Travessia's voice.

**Method.** Read every surface of both presentations and the page metadata against `content/editorial.ts`.

**Required evidence.** A signed copy review listing every surface read.

**Pass threshold.** No spelling, accent, or punctuation error, mojibake, truncated text, placeholder copy, or mislabelled action; the tone is nature-led, never academic.

**Waiver.** Not waivable.

**Capture points.** `D1#copy-review` Portuguese copy review

### D2 · Evidence Boundary

**Criterion.** Places, geography, marine life, seasons, and natural phenomena are real and plausible; Travessia, the Maré Mansa, its crew, and the itinerary are openly fictional and disclosed once per presentation.

**Method.** Check each Stop's claims (species, best season, landscape) against reputable public sources and review every surface for implied real-world operation.

**Required evidence.** A signed Evidence Boundary review with the sources consulted.

**Pass threshold.** No invented wildlife or place, no implausible season, and nothing implying a real operator, booking, availability, price, or testimonial; no citation machinery.

**Waiver.** Not waivable.

**Capture points.** `D2#boundary-review` Evidence Boundary review

### D3 · Provenance and licences

**Criterion.** Every third-party or generated asset shipped has demonstrable rights, retained proof, and the attribution its licence requires.

**Method.** Review `content/asset-manifest.json`, `docs/third-party/`, and the rendered credits in both presentations.

**Required evidence.** A signed provenance review.

**Pass threshold.** The AI-generated images, open geodata (OpenStreetMap ODbL and SRTM), the Ship model (CC BY), fonts (OFL), and dependency notices are recorded, and every required credit is visible where the asset appears.

**Waiver.** Not waivable.

**Capture points.** `D3#provenance-review` Provenance and licence review

## E · Physical-device release gate

### E1 · Full Voyage on every device

**Criterion.** Every device in the mandatory suite completes the Voyage from Stop 00 to the Arrival in the 3D presentation.

**Method.** On each device: load cold, travel by scroll, touch, or keyboard, let the Ship settle, open every Stop Card and Stop Account, jump with “Capítulos”, restart, use sound, switch presentations, enable reduced motion, and rotate phones.

**Required evidence.** A checklist and recording per device, with the device model, OS and browser versions, viewport, orientation, and power mode.

**Pass threshold.** Every device completes without an unintended fallback, context loss, crash, or outside help, and passes presentation continuity. An unavailable device is Unvalidated and blocks release until the supported suite is explicitly revised.

**Waiver.** Not waivable.

**Capture points.** `E1#iphone-safari` Current Safari on a base recent iPhone; `E1#android-a-chrome` Current Chrome on mid-range Android phone A; `E1#android-b-chrome` Current Chrome on mid-range Android phone B; `E1#windows-chrome` Current Chrome on an integrated-graphics Windows laptop; `E1#windows-firefox` Current Firefox on the same Windows laptop; `E1#macbook-safari` Current Safari on a base Apple-silicon MacBook Air

### E2 · Sustained frame budgets

**Criterion.** Physical rendering meets the approved sustained budgets through at least five active minutes.

**Method.** Enable the local diagnostic export (docs/production-assets.md), sail for at least five active minutes, and attach the exported JSON; the dossier checks that it names this candidate.

**Required evidence.** The diagnostic export per device with p90 windows, tiers, and tier changes.

**Pass threshold.** Laptops sustain Balanced with p90 ≤20 ms and phones Low with p90 ≤33.3 ms after warm-up; no device changes tier more than twice after the first minute.

**Waiver.** Not waivable.

**Capture points.** `E2#iphone-safari` Current Safari on a base recent iPhone; `E2#android-a-chrome` Current Chrome on mid-range Android phone A; `E2#android-b-chrome` Current Chrome on mid-range Android phone B; `E2#windows-chrome` Current Chrome on an integrated-graphics Windows laptop; `E2#windows-firefox` Current Firefox on the same Windows laptop; `E2#macbook-safari` Current Safari on a base Apple-silicon MacBook Air

### E3 · Timely 3D readiness

**Criterion.** The 3D voyage becomes ready quickly on real devices without ever blocking the page.

**Method.** Cold-load under a recorded production-like network and read the readiness milestone from the diagnostic export.

**Required evidence.** The network profile and readiness timestamps per device.

**Pass threshold.** The Stop 00 card appears (readiness) within 8 seconds of navigation on every device.

**Waiver.** Not waivable.

**Capture points.** `E3#iphone-safari` Current Safari on a base recent iPhone; `E3#android-a-chrome` Current Chrome on mid-range Android phone A; `E3#android-b-chrome` Current Chrome on mid-range Android phone B; `E3#windows-chrome` Current Chrome on an integrated-graphics Windows laptop; `E3#windows-firefox` Current Firefox on the same Windows laptop; `E3#macbook-safari` Current Safari on a base Apple-silicon MacBook Air

### E4 · Thermal and motion comfort

**Criterion.** Motion and heat stay comfortable for the complete Voyage.

**Method.** The tester records motion comfort, heat, throttling, and stutter after warm-up and at the Arrival.

**Required evidence.** A qualitative report plus any OS or browser performance evidence.

**Pass threshold.** No motion discomfort, no heat that makes a phone unpleasant to hold or visibly throttles the experience, and no sustained stutter. Any occurrence fails and requires a fix and a complete retest on that device.

**Waiver.** Not waivable.

**Capture points.** `E4#iphone-safari` Current Safari on a base recent iPhone; `E4#android-a-chrome` Current Chrome on mid-range Android phone A; `E4#android-b-chrome` Current Chrome on mid-range Android phone B; `E4#windows-chrome` Current Chrome on an integrated-graphics Windows laptop; `E4#windows-firefox` Current Firefox on the same Windows laptop; `E4#macbook-safari` Current Safari on a base Apple-silicon MacBook Air

### E5 · Readability and controls on real screens

**Criterion.** The Ship, Landmarks, Stop Cards, Sheets, and chrome stay readable and operable on real screens and orientations.

**Method.** Inspect every Stop, both Sheets, the closing card, and the editorial page on each device, in both orientations on phones.

**Required evidence.** Device photographs or captures and a checklist.

**Pass threshold.** No unreadable essential element, card covering its island or Ship, obscured control, browser-edge gesture conflict, or unreachable action.

**Waiver.** Not waivable.

**Capture points.** `E5#iphone-safari` Current Safari on a base recent iPhone; `E5#android-a-chrome` Current Chrome on mid-range Android phone A; `E5#android-b-chrome` Current Chrome on mid-range Android phone B; `E5#windows-chrome` Current Chrome on an integrated-graphics Windows laptop; `E5#windows-firefox` Current Firefox on the same Windows laptop; `E5#macbook-safari` Current Safari on a base Apple-silicon MacBook Air

### E6 · Failures reproduced and retested

**Criterion.** Every physical failure is reproduced, fixed, and retested on the affected device rather than averaged away.

**Method.** Keep a failure log with candidate, device, quality tier, steps, frequency, diagnostics, and the fix and retest link.

**Required evidence.** The failure log.

**Pass threshold.** Every mandatory failure has a passing complete retest on the affected device and candidate; a pass on another device cannot clear it.

**Waiver.** Not waivable.

**Capture points.** `E6#failure-log` Physical failure log

## F · First-time Visitor study

### F1 · First-time Visitors

**Criterion.** Three first-time Brazilian adults drawn to nature travel understand and complete the Voyage with no instruction beyond the scroll cue.

**Method.** Give each participant only the production interface on a supported device; observe one complete attempt, time it, then ask neutral teach-back questions about what Travessia is and what was real.

**Required evidence.** A non-identifying profile, device, duration, assistance log, Stops opened, observed blockers, and a teach-back paraphrase per participant; a study summary.

**Pass threshold.** Every participant reaches the Arrival unaided, is never blocked by controls, readability, or unclear progression, and recognises that Travessia, its Ship, and its itinerary are fictional while the islands and wildlife are real; at least two of three finish in three to five minutes (study summary).

**Waiver.** Not waivable.

**Capture points.** `F1#participant-1` Participant 1; `F1#participant-2` Participant 2; `F1#participant-3` Participant 3; `F1#summary` Study summary

## R · Release sign-off

### R1 · Technical and accessibility sign-off

**Criterion.** A named technical and accessibility reviewer signs the automated, walkthrough, accessibility, and device sections for this candidate.

**Method.** Review rows A–C and E in the generated Release Dossier.

**Required evidence.** A signed statement naming the candidate.

**Pass threshold.** Signed for this candidate after every reviewed row is recorded. If one person holds more than one role, the record states that independent review was unavailable.

**Waiver.** Not waivable.

**Capture points.** `R1#technical` Technical and accessibility reviewer

### R2 · Editorial sign-off

**Criterion.** A named editorial reviewer signs the copy, Evidence Boundary, provenance, and Visitor study sections for this candidate.

**Method.** Review rows D and F in the generated Release Dossier.

**Required evidence.** A signed statement naming the candidate.

**Pass threshold.** Signed for this candidate after every reviewed row is recorded. If one person holds more than one role, the record states that independent review was unavailable.

**Waiver.** Not waivable.

**Capture points.** `R2#editorial` Editorial reviewer

### R3 · Project-owner release verdict

**Criterion.** The project owner records the final release verdict for this candidate.

**Method.** Review the complete Release Dossier, including waivers and unvalidated risks.

**Required evidence.** The owner's signed verdict naming the candidate.

**Pass threshold.** Pass records a release approval. The dossier still reports Blocked while any other row is not Pass or waived.

**Waiver.** Not waivable.

**Capture points.** `R3#owner` Project owner
