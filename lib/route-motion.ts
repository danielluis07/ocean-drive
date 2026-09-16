import { adjacentStopIndex, clampProgress, nearestStopIndex, type ChartedRoute } from "@/lib/charted-route";

// Calibration values for how the Ship answers the Visitor, not vessel dynamics.
// Long enough to span the gap between slow mouse-wheel notches.
export const SETTLE_DELAY_MS = 350;
const EASING_RATE = 3.2;
const MAXIMUM_STOPS_PER_SECOND = 0.9;
const ARRIVED = 0.0005;

export type RouteFrame = {
  progress: number;
  target: number;
  moving: boolean;
  // The Stop the Ship rests at, or null while it is under way.
  settledStop: number | null;
};

export type RouteMotion = ReturnType<typeof createRouteMotion>;

// Owns the Ship's place on the Charted Route. Input moves a target; frames ease
// the Ship toward it and, once input stops, settle the target on the nearest Stop.
export function createRouteMotion(route: ChartedRoute, initialStop = 0) {
  let progress = nearestStopIndex(route, initialStop);
  let target = progress;
  let lastInput = -Infinity;

  const frame = (): RouteFrame => {
    const moving = progress !== target;
    return { progress, target, moving, settledStop: !moving && Number.isInteger(target) ? target : null };
  };

  return {
    frame,
    // Continuous input (wheel, trackpad, touch), measured in Stops.
    scroll(stops: number, now: number) {
      if (!Number.isFinite(stops) || stops === 0) return;
      target = clampProgress(route, target + stops);
      lastInput = now;
    },
    // Discrete input (keys) moves exactly one Stop from the current course.
    step(direction: 1 | -1) {
      target = adjacentStopIndex(route, target, direction);
      lastInput = -Infinity;
    },
    // Programmatic navigation, such as the chapters menu. A cut places the Ship
    // immediately, as when the scene is not showing.
    goTo(stop: number, { cut = false } = {}) {
      target = Math.round(clampProgress(route, stop));
      lastInput = -Infinity;
      if (cut) progress = target;
    },
    // Input has stopped for good (the page was hidden): settle without delay.
    release() {
      lastInput = -Infinity;
    },
    advance(seconds: number, now: number, reducedMotion: boolean): RouteFrame {
      if (now - lastInput >= SETTLE_DELAY_MS) target = nearestStopIndex(route, target);
      if (reducedMotion) {
        // Reduced motion never sails: the Ship cuts from Stop to Stop.
        progress = nearestStopIndex(route, target);
        return frame();
      }
      const delta = Math.max(0, Math.min(seconds, 0.05));
      const remaining = target - progress;
      const eased = remaining * (1 - Math.exp(-delta * EASING_RATE));
      const capped = Math.sign(remaining) * Math.min(Math.abs(eased), MAXIMUM_STOPS_PER_SECOND * delta);
      progress = Math.abs(remaining - capped) < ARRIVED ? target : progress + capped;
      return frame();
    },
  };
}
