# Charted Route

Implements [#35](https://github.com/danielluis07/ocean-drive/issues/35), following
[ADR 0001](adr/0001-charted-route-replaces-steering.md). The Visitor never steers:
the Ship sails one fixed, ordered route through Stops 00–04 in Voyage Waters.

## Route and progress

`lib/ocean-config.ts` lists the Stops in route order, each with the anchorage
where the Ship rests and the centre of the island Landmark beside it. Distances
are compressed; the layout only echoes the order of the coast. The route runs
west, and every Landmark lies north of its anchorage, so the Ship passes along
each island's southern shore and the north-up camera frames the island above the
Ship (see [landmarks.md](landmarks.md)).

`lib/charted-route.ts` threads a Catmull-Rom spline through the anchorages.
Route progress is measured in Stops: `0` is Stop 00, `1` is Stop 01, and
fractions lie between them. Within each passage, progress is spread by arc
length, so the Ship keeps an even pace. The Ship's heading is the path's tangent,
and progress is clamped to the route, so the Ship cannot leave it.

## Motion and input

`lib/route-motion.ts` owns the Ship's place on the route. Input moves a target;
each frame eases the Ship toward it and 50 ms at a time, so a stalled frame never
jumps along the route. The easing is close enough to the input that a short scroll
is a short move that ends when the scrolling does, and the Ship never sails faster
than 0.5 Stops per second under the Visitor's own input. A step or a chosen chapter
sails its passage in about 3.5 seconds, never slower than 0.3 or faster than 0.9
Stops per second.

| Input | Effect |
| --- | --- |
| Wheel / trackpad over the ocean | Moves the target continuously (1800 px per Stop) |
| Touch swipe over the ocean | Moves the target continuously (one viewport height per Stop; swipe up sails forward) |
| Hold ArrowDown / ArrowRight | Sails forward while held (0.25 Stops per second) |
| Hold ArrowUp / ArrowLeft | Sails back while held |
| Tap an arrow key (under 200 ms), PageDown / PageUp | Next or previous Stop |
| “Capítulos” (`goToStop(stop)` from `useVoyage()`) | Sails to that Stop in 3D and arrives immediately in the editorial presentation |

The Ship calls at every Stop. The Anchor is the Stop it last rested at, and input
reaches no further than the Stops either side of it, so one gesture is one passage
however long the Visitor keeps scrolling: the Ship comes to rest at the next Stop,
and only a fresh gesture — the wheel pausing for the settle delay, a key let go and
pressed again — sails on. A chapter chosen from “Capítulos” is the one passage the
Visitor may skip, and it moves the Anchor with it.

The Visitor chooses where the Ship rests between Stops. When continuous input stops for 350 ms,
or a held key is let go, the Ship carries on into the Stop ahead of it on its
current heading if it has come within 0.15 Stops of it; a nudge under 0.03 Stops
leaves it at the Stop it was already resting at. Otherwise it rests in open water,
with no Stop Card, until the Visitor sails on: the Ship never reverses course on
its own to a Stop the Visitor has left behind. A step moves exactly one Stop from
the current course, and a tap counts from where the key was pressed. A reload in
open water resumes at the nearest Stop. Keys are ignored in form fields and while a Sheet is open, and
route input only applies in the visible, ready 3D presentation. A
hidden page ends input and records the Ship's place on the route.

With `prefers-reduced-motion`, the scene keeps the 3D presentation but cuts from
Stop to Stop instead of sailing (never resting in open water), slows the waves, and disables the Ship's pitch and
roll.

## Camera

`lib/route-camera.ts` frames a near top-down view at 80° with a fixed north-up
orientation. The Ship sits left of centre on landscape viewports and above
centre on portrait viewports, leaving room beside it for a Stop Card (see
[minimal-chrome.md](minimal-chrome.md)) and, above it, for the Stop's Landmark.

## Voyage State

`lib/voyage-state.ts` replaces Expedition State. It records the current Stop,
Visited Stops, Voyage Complete, the Ship's place on the route, the presentation,
the quality preference, and 3D availability under the tab-scoped
`ocean-drive:voyage:v1` session key. Arriving at a Stop sets the current Stop and
route progress; reaching the Arrival (Ilha Grande) completes the Voyage whatever
has been visited. Opening a Stop's account records a Visited Stop. A reload
mid-passage settles on the nearest Stop, and “Recomeçar viagem” clears the Voyage
while keeping the visit's presentation and 3D availability. A new Voyage starts
in the ocean scene; a reload keeps a Visitor who chose “Modo leitura” there.

## Verification

- `bun test` covers progress mapping, calling at every Stop, docking and resting
  in open water, held and tapped keys, Stop steps, reduced
  motion cuts, camera pitch and framing, and Voyage State transitions and
  persistence. `tests/landmark-placement.test.ts` checks the route against each
  island's real outline: it passes beside every Landmark and never through one.
- `tests/browser/charted-route.e2e.ts` covers wheel, touch, held and tapped key
  navigation, docking, resting in open water, opening a Stop, reload/history persistence, completion, restart, and
  reduced motion in the running app.
