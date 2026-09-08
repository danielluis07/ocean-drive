# Assisted Return and Guided Helm

Scope: [issue #26](https://github.com/danielluis07/ocean-drive/issues/26).

Navigation observes the vessel's position and heading against available,
unfinished destinations, with completed stations available for revisits. Both
middle choices remain valid bearings. Two-second samples of active simulation
qualify non-progress only when the vessel has actually moved without approaching
a relevant station. Six seconds of these observations strengthen the station's
light column and water circle; fourteen seconds offer **Reorientar rota**.
Closing at least one scene unit or making a substantial turn that improves a
relevant bearing resets assistance. Continuous full turns retain their
non-progress history despite momentary bearing improvements, across tight and
wide circles; steady corrected travel ends the loop. Paused, hidden, editorial and reading time
does not advance observations; stalled frames are capped at 50 ms.

Reorientation applies one heading change toward the nearest relevant station,
preserves position, clears the old steering request and returns focus to the
manual steering surface. It never installs a destination to follow. The button
is optional, and A/D, arrow keys, drag and semantic turns remain available.

Expedition Waters have a fictional circular boundary centered at `(0, -56)`
with radius 110. Pale curved ribbons become visible before reaching the edge.
Beyond it, a bounded heading turn curves travel inward at the existing cruising
pace. It does not clamp coordinates, teleport or stop the vessel. Manual input
retains a small influence during the current; ordinary steering returns inside
radius 102. The water shader and navigation share these boundary values. These
scene units and currents are invented wayfinding, not scientific measurements.

Input listeners attach only to the canvas. Pointer capture carries a drag beyond
its bounds, while touch scrolling is suppressed only on that surface. A new
input modality releases the old one. Unrelated pointer releases, stale key-up
events and late capture-loss events cannot cancel a newer modality. Rotation,
resize, cancellation and focus loss clear gestures; app suspension also pauses
sailing until explicit resume. Source links, labels and controls remain ordinary
HTML interactions.

Camera position stays coupled to the vessel. Heading, height and look-ahead
share restrained lag while sailing; the two-destination choice widens in both
portrait and landscape. Reduced-motion 3D directly applies framing, freezes
water animation and removes camera inertia. Reading and paused layouts also
apply their framing directly.

## Verification

The approved Live Experience seam is exercised by Playwright input, assistance,
boundary and complete station journeys. Deterministic navigation-state traces
cover escalation order, correction/progress reset, heading-only reorientation,
pause, boundary return and stalled frames. Browser coverage includes pointer
capture, touch rotation during a drag, modality switching, release heading,
interactive UI exclusion and an OS blur event delivered at the browser boundary.
Reduced-motion screenshots verify stability after steering and rotation. Browser
traces are retained on failure; assistance and boundary tests save screenshots.

Run `bun run typecheck`, `bun run lint`, `bun test`, `bun run test:browser` and
`bun run build`. Chromium software WebGL verifies behavior only. Physical touch
comfort, real app-switch lifecycle, motion comfort and cross-browser/device
certification remain Unvalidated release gates in parent issue #20.
