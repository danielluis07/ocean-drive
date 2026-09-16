import { describe, expect, test } from "bun:test";
import { createChartedRoute } from "@/lib/charted-route";
import { oceanConfiguration } from "@/lib/ocean-config";
import { createRouteMotion, SETTLE_DELAY_MS } from "@/lib/route-motion";

const route = createChartedRoute(oceanConfiguration.stops.map((stop) => ({ x: stop.anchorage[0], z: stop.anchorage[1] })));
const FRAME_MS = 16;

// Run frames on a synthetic clock and return the clock afterwards.
function run(motion: ReturnType<typeof createRouteMotion>, start: number, milliseconds: number, reducedMotion = false) {
  let now = start;
  for (let elapsed = 0; elapsed < milliseconds; elapsed += FRAME_MS) {
    now += FRAME_MS;
    motion.advance(FRAME_MS / 1000, now, reducedMotion);
  }
  return now;
}

describe("Nearest-Stop settling", () => {
  test("continuous scrolling moves the Ship smoothly without jumping to a Stop", () => {
    const motion = createRouteMotion(route);
    let now = 0;
    let previous = motion.frame().progress;
    for (let frame = 0; frame < 30; frame++) {
      motion.scroll(0.02, now);
      now += FRAME_MS;
      const { progress, settledStop } = motion.advance(FRAME_MS / 1000, now, false);
      expect(progress).toBeGreaterThanOrEqual(previous);
      expect(progress - previous).toBeLessThan(0.02);
      expect(settledStop).toBeNull();
      previous = progress;
    }
    expect(previous).toBeGreaterThan(0);
  });

  test.each([
    [0.3, 0],
    [0.7, 1],
    [1.45, 1],
    [2.6, 3],
  ])("after scrolling %p Stops and stopping, the Ship settles on Stop %p", (distance, expected) => {
    const motion = createRouteMotion(route);
    motion.scroll(distance, 0);
    const now = run(motion, 0, 10_000);
    expect(now).toBeGreaterThan(SETTLE_DELAY_MS);
    expect(motion.frame()).toEqual({ progress: expected, target: expected, moving: false, settledStop: expected });
  });

  test("the Ship never rests between Stops once input stops", () => {
    const motion = createRouteMotion(route, 1);
    let now = 0;
    for (const delta of [0.2, 0.15, -0.05, 0.3]) {
      motion.scroll(delta, now);
      now = run(motion, now, 60);
    }
    let restingBetween = false;
    let lastProgress = Number.NaN;
    for (let frame = 0; frame < 1000; frame++) {
      now += FRAME_MS;
      const { progress } = motion.advance(FRAME_MS / 1000, now, false);
      if (progress === lastProgress && !Number.isInteger(progress)) restingBetween = true;
      lastProgress = progress;
    }
    expect(restingBetween).toBe(false);
    expect(motion.frame().settledStop).toBe(2);
  });

  test("the Ship keeps sailing while input continues within the settle delay", () => {
    const motion = createRouteMotion(route);
    motion.scroll(0.4, 0);
    motion.advance(FRAME_MS / 1000, SETTLE_DELAY_MS - 1, false);
    expect(motion.frame().target).toBe(0.4);
    motion.advance(FRAME_MS / 1000, SETTLE_DELAY_MS, false);
    expect(motion.frame().target).toBe(0);
  });

  test("scrolling cannot carry the Ship past either end of the route", () => {
    const motion = createRouteMotion(route, 4);
    motion.scroll(3, 0);
    expect(motion.frame().target).toBe(4);
    motion.scroll(-12, 0);
    expect(motion.frame().target).toBe(0);
  });

  test("a stalled frame never jumps the Ship across the route", () => {
    const motion = createRouteMotion(route);
    motion.goTo(4);
    const { progress } = motion.advance(600, 0, false);
    expect(progress).toBeLessThan(0.1);
  });
});

describe("Stop-to-Stop navigation", () => {
  test("each step moves exactly one Stop, including repeated presses", () => {
    const motion = createRouteMotion(route);
    motion.step(1);
    expect(motion.frame().target).toBe(1);
    motion.step(1);
    expect(motion.frame().target).toBe(2);
    run(motion, 0, 20_000);
    expect(motion.frame().settledStop).toBe(2);
    motion.step(-1);
    run(motion, 0, 20_000);
    expect(motion.frame().settledStop).toBe(1);
  });

  test("a step from between Stops goes to the next Stop in that direction", () => {
    const motion = createRouteMotion(route, 1);
    motion.scroll(0.4, 0);
    motion.step(1);
    expect(motion.frame().target).toBe(2);
  });

  test("go to Stop sails there, or cuts there immediately", () => {
    const sailing = createRouteMotion(route);
    sailing.goTo(3);
    expect(sailing.frame().moving).toBe(true);
    run(sailing, 0, 20_000);
    expect(sailing.frame().settledStop).toBe(3);

    const cut = createRouteMotion(route);
    cut.goTo(3, { cut: true });
    expect(cut.frame()).toEqual({ progress: 3, target: 3, moving: false, settledStop: 3 });
  });

  test("reduced motion cuts between Stops instead of sailing", () => {
    const motion = createRouteMotion(route);
    motion.step(1);
    expect(motion.advance(FRAME_MS / 1000, 0, true)).toEqual({ progress: 1, target: 1, moving: false, settledStop: 1 });
    motion.scroll(0.3, 100);
    const scrolling = motion.advance(FRAME_MS / 1000, 110, true);
    expect(scrolling.progress).toBe(1);
    motion.scroll(0.3, 120);
    expect(motion.advance(FRAME_MS / 1000, 130, true).progress).toBe(2);
    expect(motion.advance(FRAME_MS / 1000, 130 + SETTLE_DELAY_MS, true).settledStop).toBe(2);
  });
});
