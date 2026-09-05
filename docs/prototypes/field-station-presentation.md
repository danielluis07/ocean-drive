# Field Station presentation — throwaway reading study

Decision ticket: [Validate information presentation at Field Stations](https://github.com/danielluis07/ocean-drive/issues/11).

Status: human review completed. The authoritative [presentation resolution](https://github.com/danielluis07/ocean-drive/issues/11#issuecomment-5555261767) is recorded on the decision ticket. This branch extends the approved Mar aberto navigation prototype solely to compare information presentation. Production implementation remains outside the Wayfinder map.

## Run

```sh
bun install
bun run prototype
```

Open http://localhost:3003/?variant=C. From the original checkout, run `bun --cwd .prototypes/field-station-presentation run prototype`.

The default opens at Pulso de Calor, with the vessel stationary beside its buoy. Switch A/B/C with the floating arrows, or keyboard arrows while the comparison bar has focus. The URL preserves the layout across reloads; expedition progress stays in memory only. Use `?variant=C&sail=1` to start with the inherited sailing experience. During sailing, arrows still steer.

After leaving a reader, **Inspecionar** contains clearly marked review shortcuts for all four stations. These position the vessel and establish the selected station's prerequisites for comparison; they are developer tools, not proposed visitor navigation. The shortcuts retain passage bookmarks. The production navigation contract still requires actual arrival and deliberate Convergence completion.

## Question

Which presentation makes factual content and its sources comfortable to read while keeping the Visitor connected to the Research Vessel, the current Field Station, and the Expedition?

## The comparison

All variants inherit the approved palette: petroleum `#093b48`, jade `#348c91`, mist `#dceceb`, buoy ochre `#ecc180`, salt `#edf5f1`. Geist carries interface and body text; Georgia italic supplies the approved poetic emphasis. The signature remains the actual vessel beside the physical buoy. The camera uses the approved A calibration; the visible rendering area adapts to each reader. Positions and headings do not change with the layout.

| Variant | Desktop structure | Portrait adaptation | Tradeoff to judge |
| --- | --- | --- | --- |
| A — Margem de leitura | Salt reading margin on the right; ocean retains the remaining width; progress, passage, conceptual relation, fixed departure actions | Full-width lower sheet; visible ocean above | Strongest separation of reading and spatial context; less cinematic text integration |
| B — Convés de leitura | Wide lower reading deck; context and conceptual relationship occupy a separate column | Context compacts above the passage; taller inset sheet | More horizontal editorial space, but less vertical ocean and a smaller vessel |
| C — Voz da estação | Short, large passages directly over the ocean with a directional dark scrim; actions follow the passage; no separate relation diagram | Dark lower reading area continues the ocean palette; compact sea view above | Closest connection between text and scene; contrast and denser future content need more care |

The human's selection is recorded in the linked [presentation resolution](https://github.com/danielluis07/ocean-drive/issues/11#issuecomment-5555261767). All three variants remain here as archived comparison material.

The first composition pass exposed two issues: the mobile debug state label overlapped the departure note, and the initial C read too similarly to A. The debug label moved to the top; C now uses a continuous ocean composition and flowing passage/actions. Existing art-direction tokens and navigation semantics were retained.

## Shared interaction hypotheses

- Each station has three short core passages. There is no automatic advance, timer, quiz, or required source visit.
- Reading pauses movement and steering. The dialog protects keyboard focus while its transparent surroundings preserve the world visually. Text remains real HTML.
- Previous/next moves through the core passages; next focuses the new heading. The current passage is bookmarked separately for each station for this in-memory visit.
- **Fonte deste trecho** expands the source record in the same reading surface. It names the supporting paper section or table, provides bibliographic details and a direct article link, and explains the Evidence Boundary. Opening sources does not change progress or position.
- Escape closes an open source record first. Otherwise it acts like **Voltar ao mar**, preserving the passage without completing an unfinished station. Focus returns to the ocean surface.
- Reaching the final passage records that the core has been reached, but does not complete the station. **Continuar expedição** confirms the visit and resumes the inherited sailing model; **Conectar expedição** confirms the Convergence synthesis.
- **Voltar ao mar** remains a non-completing exit even on the final passage. This explicit distinction is a review hypothesis: confirm whether both deliberate exits should count after reaching the core, or whether only the completion action should count.
- Sources and layout switches preserve the active passage. Resizing preserves state. Reloading resets the in-memory Expedition while retaining the URL's presentation choice.
- The existing visibility handler pauses when leaving the browser tab. If an external source triggered that pause, returning to sailing still requires the inherited explicit resume action.
- The separate text version contains all twelve passages and twelve source links. Reduced motion or unavailable WebGL selects this independent HTML reading route.

The development-only state disclosure exposes the station, passage, source visibility, core-reached state, completed stations, position, heading, and bookmarks. The comparison controls remain available inside the reading dialog so a modal does not block the study itself.

## Content and evidence

The study uses concise qualitative paraphrases of [Duarte et al. (2020), Heat Waves Are a Major Threat to Turbid Coral Reefs in Brazil](https://www.frontiersin.org/journals/marine-science/articles/10.3389/fmars.2020.00179/full), read for this prototype. It adds no invented measurements, geographic positions, or event-attribution claim. Source records point to the abstract/environmental variables for heat, sampling definitions for bleaching versus mortality, and results/tables for differences between organisms and sites. Convergence synthesizes those same observations.

The relationship diagrams are explicitly conceptual and unscaled. They are not quantitative charts, scientific figures, or geographic maps. Copy, exact passage count, source-record granularity, and final visualization detail are not approved merely because the prototype makes them concrete. The fictional institute, vessel, station names, and route remain separated from the historical research.

## Captured views

| Variant | Desktop, 1440 × 1000 | Portrait, 390 × 844 |
| --- | --- | --- |
| A | [Desktop](field-station-presentation/A-desktop.png) | [Portrait](field-station-presentation/A-mobile.png) |
| B | [Desktop](field-station-presentation/B-desktop.png) | [Portrait](field-station-presentation/B-mobile.png) |
| C | [Desktop](field-station-presentation/C-desktop.png) | [Portrait](field-station-presentation/C-mobile.png) |

Additional captures: [desktop sources](field-station-presentation/sources-desktop.png), [portrait sources](field-station-presentation/sources-mobile.png), [independent text presentation](field-station-presentation/editorial-mobile.png).

## Verification and limits

`bun run lint`, `bun x tsc --noEmit`, and `git diff --check` passed. The scoped Impeccable detector reported no findings in the new reader. Chrome browser walkthroughs covered all three layouts on desktop/portrait with no horizontal page overflow or observed JavaScript errors; the inherited upstream Three.js Clock deprecation warning remains.

Observed behaviors: changing layout with passage two and sources open preserved position, heading, passage, source visibility, and completion; early exit left the station incomplete; the review shortcut reopened the saved passage; the final passage waited for deliberate completion; completing Pulso unlocked both middle stations; the Convergence shortcut plus deliberate reading exit reached Connected Expedition. The shortcuts do not validate travel order or arrival, which belong to the inherited navigation study.

Small-screen checks at 320 × 568 and landscape at 844 × 390 found no horizontal page overflow and reachable primary buttons. Rotation preserved the passage, keyboard layout changes survived reload, and Escape returned focus to the steering surface. Reduced-motion and deliberately unavailable-WebGL walkthroughs each exposed four HTML station sections with twelve source links. Internal scroll areas handle overflowing text and source detail.

No production build, deployment, automated test suite, physical-phone comfort test, screen-reader certification, thermal measurement, final editorial signoff, or complete three-to-five-minute human journey is claimed. The scene remains the disposable navigation implementation, not an architecture choice. Presentation selection is complete; the linked resolution assigns remaining content, interaction, and physical-device detail to their existing tickets.

## Archived review prompt

Compare the amount of ocean and the vessel size in each layout, read two passages, open the source record, leave early, and use the review shortcut to reopen the station. Select a base presentation or a specific combination. Then settle whether the short-passage structure/source expansion and the final-passage exit distinction match the intended reading experience.
