# Charted Route

Implements [#35](https://github.com/danielluis07/ocean-drive/issues/35), following
[ADR 0001](adr/0001-charted-route-replaces-steering.md). The Visitor never steers:
the Ship sails one fixed, ordered route through Stops 00–04 in Voyage Waters.

## Route and progress

`lib/ocean-config.ts` lists the Stops in route order, each with the anchorage
where the Ship rests and a placeholder Landmark beside it. Distances are
compressed; the layout only echoes the order of the coast.

`lib/charted-route.ts` threads a Catmull-Rom spline through the anchorages.
Route progress is measured in Stops: `0` is Stop 00, `1` is Stop 01, and
fractions lie between them. Within each passage, progress is spread by arc
length, so the Ship keeps an even pace. The Ship's heading is the path's tangent,
and progress is clamped to the route, so the Ship cannot leave it.

## Motion and input

`lib/route-motion.ts` owns the Ship's place on the route. Input moves a target;
each frame eases the Ship toward it, capped at 0.9 Stops per second and 50 ms per
frame, so a stalled frame never jumps along the route.

| Input | Effect |
| --- | --- |
| Wheel / trackpad over the ocean | Moves the target continuously (700 px per Stop) |
| Touch swipe over the ocean | Moves the target continuously (60% of the viewport height per Stop; swipe up sails forward) |
| ArrowDown / ArrowRight / PageDown | Next Stop |
| ArrowUp / ArrowLeft / PageUp | Previous Stop |
| `goToStop(stop)` from `useVoyage()` | Sails to that Stop in 3D and arrives immediately in the editorial presentation (for the chapters menu) |

When continuous input stops for 350 ms, the target settles on the nearest Stop,
so the Ship never rests between Stops. A step moves exactly one Stop from the
current course. Keys are ignored in form fields and while the Stop reader is
open, and route input only applies in the visible, ready 3D presentation. A
hidden page ends input and records the Ship's place on the route.

With `prefers-reduced-motion`, the scene keeps the 3D presentation but cuts from
Stop to Stop instead of sailing, slows the waves, and disables the Ship's pitch and
roll.

## Camera

`lib/route-camera.ts` frames a near top-down view at 80° with a fixed north-up
orientation. The Ship sits left of centre on landscape viewports and above
centre on portrait viewports, leaving room beside it for a Stop Card. Until Stop
Cards arrive, a placeholder “Ler parada” opener stands in that space while the
Ship rests at a Stop with an account.

## Voyage State

`lib/voyage-state.ts` replaces Expedition State. It records the current Stop,
Visited Stops, Voyage Complete, the Ship's place on the route, the presentation,
the quality preference, and 3D availability under the tab-scoped
`ocean-drive:voyage:v1` session key. Arriving at a Stop sets the current Stop and
route progress; reaching the Arrival (Ilha Grande) completes the Voyage whatever
has been visited. Opening a Stop's account records a Visited Stop. A reload
mid-passage settles on the nearest Stop, and “Recomeçar viagem” clears the Voyage
while keeping the visit's 3D availability.

## Verification

- `bun test` covers progress mapping, nearest-Stop settling, Stop steps, reduced
  motion cuts, camera pitch and framing, and Voyage State transitions and
  persistence.
- `tests/browser/charted-route.e2e.ts` covers wheel, touch, and key navigation,
  settling, opening a Stop, reload/history persistence, completion, restart, and
  reduced motion in the running app.
