# Complete Field Station journey

Implementation scope: [issue #25](https://github.com/danielluis07/ocean-drive/issues/25),
extending the minimum sailable Expedition from #24.

The four beacon locations live in `lib/ocean-config.ts` and never move with
progress. Pulso de Calor is named and illuminated first. Completing it reveals
both middle destinations together. Completed beacons retain their names and
revisit action with quieter light and water. Convergência receives its name and
approach light only after all evidence stations are complete. The distances,
colors, and approach radii describe the fictional route, not reef geography or
scientific measurements.

Visitors use Guided Helm to reach the visible approach circles. Within a circle,
the vessel slows from its cruising pace and gently aligns toward the beacon.
Arrival pauses navigation, checkpoints both the current pose and that station's
pose, and opens the bookmarked signal. A departure latch prevents immediate
reopening until the vessel leaves the approach zone; the nearby label also
supports an explicit revisit while paused. No label transports the vessel or
sets its heading.

Voz da estação renders the existing approved signals and source records. Desktop
reading uses a protected dark surface beside a persistent ocean view; phones
place a compact world above the single-column reader. Caderno de bordo replaces
the signal inside the same reader and keeps only that signal's source records.
Voltar ao sinal and the first Escape close Caderno and focus the bookmarked
heading. A second Escape or Voltar ao mar closes the reader without completion
and returns focus to the movement control. Returning from an external source
preserves the source link's focus, bookmarks, and completion state.

Continuar expedição completes an evidence station and returns to paused waters.
In 3D it never selects or opens the next station. Convergência requires a separate
arrival, its three synthesis signals, and Conectar expedição. The existing
editorial presentation retains its sequential reading behavior and shares all
bookmarks, route order, completion, and persisted vessel checkpoints.

## Verification

Run `bun run typecheck`, `bun run lint`, `bun test`,
`bun run test:browser`, and `bun run build`.

The browser journey tests navigate with the shipped keyboard controls and use
the public persisted Expedition State for course feedback. They do not teleport
the vessel, seed completion, or use renderer test hooks. Coverage includes both
middle orders, first arrival, source-tab return, Escape layering, bookmarks,
completed-station revisits, deliberate synthesis, reload, and desktop/phone
reading layouts. External source responses are substituted at the network
boundary so those tests verify navigation and continuity independently of
publisher uptime.

Chromium software WebGL verifies behavior. Physical-device performance, touch
comfort, cross-browser certification, and unaided three-to-five-minute completion
remain part of the parent issue's Release Dossier. Assisted Return and boundary
currents are described in [assisted-return.md](assisted-return.md); adaptive
quality and restoration belong to #27.
