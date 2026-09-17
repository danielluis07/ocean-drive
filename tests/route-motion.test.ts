import { describe, expect, test } from "bun:test";
import { createChartedRoute } from "@/lib/charted-route";
import { oceanConfiguration } from "@/lib/ocean-config";
import { createRouteMotion, DOCKING_CLING, DOCKING_REACH, SETTLE_DELAY_MS, TAP_MS } from "@/lib/route-motion";

const route = createChartedRoute(oceanConfiguration.stops.map((stop) => ({ x: stop.anchorage[0], z: stop.anchorage[1] })));
const FRAME_MS = 16;
// About what one mouse-wheel notch moves the Ship.
const NOTCH = 0.056;

// Run frames on a synthetic clock and return the clock afterwards.
function run(motion: ReturnType<typeof createRouteMotion>, start: number, milliseconds: number, reducedMotion = false) {
  let now = start;
  for (let elapsed = 0; elapsed < milliseconds; elapsed += FRAME_MS) {
    now += FRAME_MS;
    motion.advance(FRAME_MS / 1000, now, reducedMotion);
  }
  return now;
}

describe("Following the Visitor's input", () => {
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

  test("a single notch moves the Ship a short way and the move ends with the scrolling", () => {
    const motion = createRouteMotion(route);
    motion.scroll(NOTCH, 0);
    // Half a second later the Ship has covered the notch and stopped there.
    run(motion, 0, 500);
    expect(motion.frame().progress).toBeCloseTo(NOTCH, 2);
    run(motion, 500, 5000);
    expect(motion.frame().progress).toBeCloseTo(NOTCH, 6);
  });

  test("a whole passage under way keeps an unhurried pace", () => {
    const motion = createRouteMotion(route);
    motion.scroll(1, 0);
    // Cruising caps the Ship well short of the Stop after one second.
    run(motion, 0, 1000);
    expect(motion.frame().progress).toBeLessThan(0.6);
    run(motion, 1000, 10_000);
    expect(motion.frame().settledStop).toBe(1);
  });

  test("scrolling cannot carry the Ship past either end of the route", () => {
    const motion = createRouteMotion(route, 4);
    motion.scroll(3, 0);
    expect(motion.frame().target).toBe(4);
    motion.scroll(-12, 0);
    expect(motion.frame().target).toBe(3);
  });

  test("a stalled frame never jumps the Ship across the route", () => {
    const motion = createRouteMotion(route);
    motion.goTo(4);
    const { progress } = motion.advance(600, 0, false);
    expect(progress).toBeLessThan(0.1);
  });
});

describe("Docking and open water", () => {
  test("a nudge away from a Stop leaves the Ship where the Visitor put it", () => {
    const motion = createRouteMotion(route);
    motion.scroll(NOTCH, 0);
    run(motion, 0, 5000);
    expect(motion.frame()).toEqual({ progress: NOTCH, target: NOTCH, moving: false, settledStop: null });
  });

  test("a nudge smaller than the cling leaves the Ship at the Stop it was resting at", () => {
    const motion = createRouteMotion(route, 1);
    motion.scroll(DOCKING_CLING / 2, 0);
    run(motion, 0, 5000);
    expect(motion.frame().settledStop).toBe(1);
  });

  test("stopping within reach ahead of a Stop carries the Ship into it", () => {
    const motion = createRouteMotion(route);
    motion.scroll(1 - DOCKING_REACH / 2, 0);
    run(motion, 0, 10_000);
    expect(motion.frame().settledStop).toBe(1);
  });

  test.each([0.4, 0.5, 0.7])("after scrolling %p Stops into open water, the Ship rests there", (distance) => {
    const motion = createRouteMotion(route);
    motion.scroll(distance, 0);
    run(motion, 0, 30_000);
    expect(motion.frame()).toEqual({ progress: distance, target: distance, moving: false, settledStop: null });
  });

  test("the Ship never turns back to a Stop the Visitor has left behind", () => {
    // Just past Stop 01, on the way forward: the Ship holds its place.
    const onward = createRouteMotion(route, 1);
    onward.scroll(0.1, 0);
    run(onward, 0, 10_000);
    expect(onward.frame().progress).toBeCloseTo(1.1, 6);
    expect(onward.frame().settledStop).toBeNull();
    // Scrolling back brings Stop 01 within reach ahead, so the Ship docks there.
    onward.scroll(-0.05, 10_000);
    run(onward, 10_000, 10_000);
    expect(onward.frame().settledStop).toBe(1);
  });

  test("the Ship keeps its course while input continues within the settle delay", () => {
    const motion = createRouteMotion(route);
    motion.scroll(DOCKING_CLING / 2, 0);
    motion.advance(FRAME_MS / 1000, SETTLE_DELAY_MS - 1, false);
    expect(motion.frame().target).toBe(DOCKING_CLING / 2);
    motion.advance(FRAME_MS / 1000, SETTLE_DELAY_MS, false);
    expect(motion.frame().target).toBe(0);
  });
});

describe("Calling at every Stop", () => {
  test("one long gesture sails one passage and the Ship holds at the Stop", () => {
    const motion = createRouteMotion(route);
    let now = 0;
    // Scrolling on and on, well past Stop 01, without ever pausing.
    for (let frame = 0; frame < 600; frame++) {
      motion.scroll(0.05, now);
      now += FRAME_MS;
      expect(motion.advance(FRAME_MS / 1000, now, false).progress).toBeLessThanOrEqual(1);
    }
    expect(motion.frame().settledStop).toBe(1);
  });

  test("the Ship sails on once the gesture has ended", () => {
    const motion = createRouteMotion(route);
    motion.scroll(3, 0);
    let now = run(motion, 0, 10_000);
    expect(motion.frame().settledStop).toBe(1);
    motion.scroll(3, now);
    now = run(motion, now, 10_000);
    expect(motion.frame().settledStop).toBe(2);
  });

  test("repeated taps before the Ship arrives never skip a Stop", () => {
    const motion = createRouteMotion(route);
    motion.step(1);
    motion.step(1);
    motion.step(1);
    expect(motion.frame().target).toBe(1);
    const now = run(motion, 0, 10_000);
    expect(motion.frame().settledStop).toBe(1);
    motion.step(1);
    run(motion, now, 10_000);
    expect(motion.frame().settledStop).toBe(2);
  });

  test("a chosen chapter is the one passage the Visitor may skip", () => {
    const motion = createRouteMotion(route);
    motion.goTo(3);
    const now = run(motion, 0, 20_000);
    expect(motion.frame().settledStop).toBe(3);
    // The Anchor moves with it, so the route carries on from there.
    motion.scroll(3, now);
    run(motion, now, 20_000);
    expect(motion.frame().settledStop).toBe(4);
  });

  test("reduced motion still cuts one Stop at a time", () => {
    const motion = createRouteMotion(route);
    motion.step(1);
    motion.step(1);
    expect(motion.advance(FRAME_MS / 1000, 0, true).settledStop).toBe(1);
  });
});

describe("Held keys", () => {
  test("holding a key sails freely and letting go leaves the Ship in open water", () => {
    const motion = createRouteMotion(route);
    motion.hold(1, 0);
    let now = run(motion, 0, 2000);
    expect(motion.frame().settledStop).toBeNull();
    motion.letGo(now);
    now = run(motion, now, 10_000);
    const { progress, moving, settledStop } = motion.frame();
    expect(progress).toBeGreaterThan(DOCKING_REACH);
    expect(progress).toBeLessThan(1 - DOCKING_REACH);
    expect(moving).toBe(false);
    expect(settledStop).toBeNull();
    // Holding back sails astern along the route.
    motion.hold(-1, now);
    now = run(motion, now, 1000);
    motion.letGo(now);
    run(motion, now, 10_000);
    expect(motion.frame().progress).toBeLessThan(progress);
  });

  test("letting go of a held key within reach of a Stop docks there", () => {
    const motion = createRouteMotion(route, 1);
    motion.scroll(-0.35, 0);
    let now = run(motion, 0, 10_000);
    motion.hold(1, now);
    now = run(motion, now, TAP_MS + 1000);
    motion.letGo(now);
    run(motion, now, 10_000);
    expect(motion.frame().settledStop).toBe(1);
  });

  test("a tap goes to the adjacent Stop from where the key was pressed", () => {
    const motion = createRouteMotion(route);
    motion.hold(1, 0);
    motion.letGo(TAP_MS - 1);
    expect(motion.frame().target).toBe(1);
    // Once the Ship has called at Stop 01, the next tap sails on to Stop 02.
    const now = run(motion, 0, 10_000);
    motion.hold(1, now);
    motion.letGo(now);
    expect(motion.frame().target).toBe(2);

    const between = createRouteMotion(route, 1);
    between.scroll(-0.4, 0);
    between.hold(1, 0);
    between.letGo(50);
    expect(between.frame().target).toBe(1);
  });

  test("a hold that has started sailing never also steps", () => {
    const motion = createRouteMotion(route);
    motion.hold(1, 0);
    const now = run(motion, 0, TAP_MS + FRAME_MS * 3);
    motion.letGo(now);
    expect(motion.frame().target).toBeLessThan(DOCKING_REACH);
  });
});

describe("Stop-to-Stop navigation", () => {
  test("each step moves exactly one Stop, in either direction", () => {
    const motion = createRouteMotion(route);
    motion.step(1);
    expect(motion.frame().target).toBe(1);
    let now = run(motion, 0, 30_000);
    expect(motion.frame().settledStop).toBe(1);
    motion.step(1);
    expect(motion.frame().target).toBe(2);
    now = run(motion, now, 30_000);
    expect(motion.frame().settledStop).toBe(2);
    motion.step(-1);
    run(motion, now, 30_000);
    expect(motion.frame().settledStop).toBe(1);
  });

  test("a step sails its passage rather than cutting across it", () => {
    const motion = createRouteMotion(route);
    motion.step(1);
    run(motion, 0, 1000);
    expect(motion.frame().progress).toBeLessThan(0.5);
    run(motion, 1000, 10_000);
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

  test("a chosen chapter far along the route still arrives promptly", () => {
    const motion = createRouteMotion(route);
    motion.goTo(4);
    run(motion, 0, 6000);
    expect(motion.frame().settledStop).toBe(4);
  });

  test("reduced motion cuts between Stops instead of sailing or resting in open water", () => {
    const motion = createRouteMotion(route);
    motion.step(1);
    expect(motion.advance(FRAME_MS / 1000, 0, true)).toEqual({ progress: 1, target: 1, moving: false, settledStop: 1 });
    motion.scroll(0.3, 100);
    const scrolling = motion.advance(FRAME_MS / 1000, 110, true);
    expect(scrolling.progress).toBe(1);
    motion.scroll(0.3, 120);
    expect(motion.advance(FRAME_MS / 1000, 130, true).progress).toBe(2);
    expect(motion.advance(FRAME_MS / 1000, 130 + SETTLE_DELAY_MS, true).settledStop).toBe(2);
    // A held key moves exactly one Stop, at once.
    motion.hold(1, 1000);
    expect(motion.advance(FRAME_MS / 1000, 1000, true).settledStop).toBe(3);
    motion.letGo(3000);
    expect(motion.advance(FRAME_MS / 1000, 3000, true).settledStop).toBe(3);
  });
});
