# Loading and presentation transitions — review prototype

Status: proposed behavior, awaiting the human's review. This does not resolve the decision ticket or change production code.

Decision: [Specify loading and presentation transitions](https://github.com/danielluis07/ocean-drive/issues/18), within [Chart the Ocean Drive showcase project](https://github.com/danielluis07/ocean-drive/issues/1).

## Open the demo

Double-click [the standalone HTML file](../../app/_prototype/loading-transitions.html). It needs no installation, server, network, or build. From the original workspace it lives at `.prototypes/loading-transitions/app/_prototype/loading-transitions.html`.

The fixed bottom control advances the current walkthrough while keeping the preview in view. Use the walkthrough tabs to reset to a known scenario, or the free-play controls to inject individual events. The inspector displays the shared state after each event. Its vocabulary and technical detail belong to the laboratory, not the production visitor interface.

## Question and recommendation

How should readable HTML, initial 3D readiness, presentation switches, deferred details, restoration, and failure fit together without interrupting the Visitor or inventing progress?

Compare two proposals for initial entry using the selector:

- **A — readiness-led reveal:** show the paused ocean as soon as it is ready if the Visitor has neither opened a Field Station nor selected the text presentation. Once reading starts, offer explicit entry. This model only demonstrates those explicit reading signals; passive reading and keyboard exploration would need a broader interaction rule if A is selected.
- **B — explicit entry (recommended):** announce readiness and offer “Explorar em 3D”; keep the editorial presentation until activation. This makes presentation changes deliberate and does not depend on guessing whether someone is reading the introduction.

Both require explicit “Iniciar expedição” before first movement and “Retomar expedição” on subsequent return. This first-movement proposal is also awaiting review. Both reopen a station's matching passage when returning to 3D during reading.

## Proposed choreography to review

| Situation | Visible and actionable behavior |
| --- | --- |
| HTML delivered, JavaScript pending | Full editorial story and sources are readable in production. No loading overlay obscures them. “Versão em texto” stays available. |
| Capability check and core preparation | Concise stage messages: checking navigation, receiving vessel, preparing ocean and controls, checking the first valid image. No percentages, forced dwell, or fabricated countdown. Slow preparation keeps the same readable screen. |
| Minimum sailable set ready | Reveal or invite according to A/B. Readiness requires usable ocean, selected vessel, Guided Helm, first station and semantic labels, plus a valid frame with controls connected. Decoding/shader preparation must complete before the readiness event. |
| Nonessential fonts or details pending/failed | Use system fonts, simplified beacons and baseline effects. No error dialog or progress blockade. Later station core narrative is already delivered. Optional details can arrive without moving focus, navigation, or reading position. |
| Text ↔ 3D | Preserve station, all passage bookmarks, completion, middle-station order, Connected Expedition, vessel position and heading. Close Caderno de bordo on presentation changes. Focus the same passage heading, or the editorial main heading / 3D resume control when outside a station. |
| Essential loading failure or unsupported 3D | Explain the reason and open the editorial presentation at the same place. Failed 3D is unavailable for the visit; restarting the Expedition does not reset that lock. |
| First context loss | Pause, preserve state, show text, attempt restoration once. Success offers explicit return; it never takes over the reading screen. |
| Failed restoration or second context loss | Keep the visit in text with an explanation and no further restoration loop. |
| Sustained unusable performance at Low | Preserve progress and transition to text. The threshold is owned by the approved architecture; the demo injects its resulting event. |
| Hidden tab / app switch | Pause immediately. Return does not move the vessel or advance progress. Require explicit resume outside an open station reader. |
| Reload / history restoration | Restore the approved state, show readable content, prepare eligible 3D, offer explicit return, and remain paused. The demo simulates restoration in memory. |
| Reduced-motion preference | Open text and defer 3D preparation until the explicit reduced-motion 3D request. A capability/failure lock cannot be overridden. |

Use an atomic presentation handover when the new surface is usable; do not introduce a blank interstitial, loading animation, camera journey, or minimum-duration crossfade. Preserve layout and focus while background milestones finish. A polite status region announces meaningful availability and failure changes; decorative substitutions need no visitor-facing warning.

These are proposals for this ticket where the earlier decisions leave details open. The confirmed constraints remain in [Specify the accessible editorial fallback](https://github.com/danielluis07/ocean-drive/issues/12), [Lock the delivery architecture and quality budgets](https://github.com/danielluis07/ocean-drive/issues/13), [Define the visual asset inventory and sourcing strategy](https://github.com/danielluis07/ocean-drive/issues/14), and [Finalize the Field Station copy and citations](https://github.com/danielluis07/ocean-drive/issues/16). In particular, the asset inventory explicitly makes custom fonts nonessential; system typography satisfies usable entry.

## Review scenarios

The eight walkthroughs cover first arrival, reading during preparation, delayed visual details, essential failure, one successful restoration followed by a second loss, tab return and visit restoration, reduced motion, and shared Expedition progress. Free-play also exposes failed restoration, unsupported 3D, and low-tier performance fallback.

Start with **Primeira chegada** under both A and B, then **Leitura durante a espera** and **Recuperar o oceano**. Evaluate whether the transition occurs when expected, the messages make sense, and the same reading position remains available.

## Evidence and limits

The prototype is one HTML file with a pure state reducer and a thin DOM shell. All preparation and failure events are injected manually. It downloads no assets, renders no WebGL scene, simulates no continuous sailing, and writes no storage. Station passages and citation records are explicitly placeholders; the approved scientific copy remains in the existing editorial source.

Browser review used headless Chrome with Bun driving its debugging protocol. All eight guided walkthroughs were exercised under both entry policies with no JavaScript exceptions. The observed results preserved reading bookmarks and vessel pose across presentation changes and recovery, kept the second context loss locked, and kept Convergence unavailable before its prerequisites. The reader reflowed at 390 × 844 without horizontal page overflow; the desktop preview was visually inspected at 1440 × 1000.

This establishes that the discussion artifact runs. It does not validate real load timing, font swapping, WebGL recovery, sessionStorage/history behavior, production accessibility, device performance, or animation comfort. There are no production changes or automated test suite. The human decision is still pending.
