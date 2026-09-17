import { adjacentStopIndex, clampProgress, nearestStopIndex, type ChartedRoute } from "@/lib/charted-route";

// Calibration values for how the Ship answers the Visitor, not vessel dynamics.
// Long enough to span the gap between slow mouse-wheel notches.
export const SETTLE_DELAY_MS = 350;
// Coming to rest this close ahead of a Stop carries the Ship on into it.
export const DOCKING_REACH = 0.15;
// A nudge this small never took the Ship away from the Stop it was resting at.
export const DOCKING_CLING = 0.03;
// A held key shorter than this is a tap, which sails on to the adjacent Stop.
export const TAP_MS = 200;
// How closely the Ship follows the Visitor's input, in Stops per second per Stop
// of distance: high enough that a short scroll is a short move that ends with it.
const EASING_RATE = 7;
// The fastest the Visitor's own input drives the Ship.
const CRUISE_STOPS_PER_SECOND = 0.5;
// A held arrow key sails at an unhurried, steady pace.
const HELD_STOPS_PER_SECOND = 0.25;
// A step or a chosen chapter sails its own passage, never slower or faster than these.
const PASSAGE_SECONDS = 3.5;
const SLOWEST_PASSAGE = 0.3;
const FASTEST_PASSAGE = 0.9;
const ARRIVED = 0.0005;

export type RouteFrame = {
  progress: number;
  target: number;
  moving: boolean;
  // The Stop the Ship rests at, or null while it is under way or in open water.
  settledStop: number | null;
};

export type RouteMotion = ReturnType<typeof createRouteMotion>;

type HeldCourse = { direction: 1 | -1; origin: number; since: number; stepped: boolean };

// Owns the Ship's place on the Charted Route. Input moves a target; frames ease
// the Ship toward it and, once input stops, dock it at a Stop within reach ahead.
export function createRouteMotion(route: ChartedRoute, initialStop = 0) {
  let progress = nearestStopIndex(route, initialStop);
  let target = progress;
  let lastInput = -Infinity;
  let pace = CRUISE_STOPS_PER_SECOND;
  let heading: 1 | -1 = 1;
  let held: HeldCourse | null = null;
  // Every Stop is called at: the Anchor is the Stop the Ship last rested at, and
  // input reaches no further than the Stops either side of it. One gesture is
  // therefore one passage, however long the Visitor keeps scrolling.
  let anchor = progress;

  const frame = (): RouteFrame => {
    const moving = progress !== target;
    return { progress, target, moving, settledStop: !moving && Number.isInteger(target) ? target : null };
  };

  // Clamped to the route, then to the passage the Visitor is allowed to sail.
  const reachable = (value: number) =>
    Math.min(anchor + 1, Math.max(anchor - 1, clampProgress(route, value)));

  const passagePace = () =>
    Math.min(FASTEST_PASSAGE, Math.max(SLOWEST_PASSAGE, Math.abs(target - progress) / PASSAGE_SECONDS));

  const steer = (direction: 1 | -1) => {
    heading = direction;
    pace = CRUISE_STOPS_PER_SECOND;
  };

  const dock = (reducedMotion: boolean) => {
    const nearest = nearestStopIndex(route, target);
    // Reduced motion never rests between Stops: the Ship only cuts from Stop to Stop.
    if (reducedMotion || Math.abs(target - nearest) <= DOCKING_CLING) {
      target = nearest;
      return;
    }
    // The Ship carries on into a Stop it has nearly reached, and never turns back
    // to one the Visitor has deliberately left behind.
    const ahead = adjacentStopIndex(route, target, heading);
    if (Math.abs(ahead - target) <= DOCKING_REACH) target = ahead;
  };

  return {
    frame,
    // Continuous input (wheel, trackpad, touch), measured in Stops.
    scroll(stops: number, now: number) {
      if (!Number.isFinite(stops) || stops === 0) return;
      target = reachable(target + stops);
      lastInput = now;
      steer(stops > 0 ? 1 : -1);
    },
    // Discrete input (Page keys) moves exactly one Stop from the current course.
    step(direction: 1 | -1) {
      target = reachable(adjacentStopIndex(route, target, direction));
      lastInput = -Infinity;
      heading = direction;
      pace = passagePace();
    },
    // Arrow keys: holding sails freely along the route; a tap goes to the adjacent Stop.
    hold(direction: 1 | -1, now: number) {
      if (held?.direction === direction) return;
      held = { direction, origin: target, since: now, stepped: false };
      steer(direction);
    },
    letGo(now: number) {
      if (!held) return;
      if (!held.stepped && now - held.since < TAP_MS) {
        target = reachable(adjacentStopIndex(route, held.origin, held.direction));
        pace = passagePace();
      }
      held = null;
      lastInput = -Infinity;
    },
    // Programmatic navigation, such as the chapters menu. A cut places the Ship
    // immediately, as when the scene is not showing.
    // A chosen chapter is the one passage the Visitor may skip.
    goTo(stop: number, { cut = false } = {}) {
      target = Math.round(clampProgress(route, stop));
      anchor = target;
      lastInput = -Infinity;
      held = null;
      if (target !== progress) heading = target > progress ? 1 : -1;
      pace = passagePace();
      if (cut) progress = target;
    },
    // Input has stopped for good (the page was hidden): settle without delay.
    release() {
      held = null;
      lastInput = -Infinity;
    },
    advance(seconds: number, now: number, reducedMotion: boolean): RouteFrame {
      const delta = Math.max(0, Math.min(seconds, 0.05));
      if (held && !held.stepped && reducedMotion) {
        // Reduced motion answers a held key at once with a single Stop.
        target = reachable(adjacentStopIndex(route, held.origin, held.direction));
        held.stepped = true;
      } else if (held && !reducedMotion && now - held.since >= TAP_MS) {
        held.stepped = true;
        target = reachable(target + held.direction * HELD_STOPS_PER_SECOND * delta);
        lastInput = now;
      }
      // The gesture has ended once input stops for the settle delay, or the key
      // is let go; only then does a Stop the Ship is resting at become the Anchor.
      const idle = !held && now - lastInput >= SETTLE_DELAY_MS;
      if (idle) dock(reducedMotion);
      if (reducedMotion) {
        progress = nearestStopIndex(route, target);
        if (idle) anchor = progress;
        return frame();
      }
      const remaining = target - progress;
      const eased = remaining * (1 - Math.exp(-delta * EASING_RATE));
      const capped = Math.sign(remaining) * Math.min(Math.abs(eased), pace * delta);
      progress = Math.abs(remaining - capped) < ARRIVED ? target : progress + capped;
      if (idle && progress === target && Number.isInteger(progress)) anchor = progress;
      return frame();
    },
  };
}
