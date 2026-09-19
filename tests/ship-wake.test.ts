import { describe, expect, test } from "bun:test";
import { createShipWake, WAKE_LIFETIME } from "@/lib/ship-wake";

const FRAME = 1 / 60;
const POINTS = 32;

// Sail due north (-Z) at `speed` world units per second for `seconds`.
function sail(wake: ReturnType<typeof createShipWake>, from: { z: number; time: number }, speed: number, seconds: number) {
  let { z, time } = from;
  for (let elapsed = 0; elapsed < seconds; elapsed += FRAME) {
    z -= speed * FRAME;
    time += FRAME;
    wake.sail({ x: 0, z }, 0, FRAME, time);
  }
  return { z, time };
}

function written(wake: ReturnType<typeof createShipWake>, time: number, points = POINTS) {
  const trail = new Float32Array(points * 4);
  const forces = new Float32Array(points * 4);
  const bounds = new Float32Array(4);
  wake.write(trail, forces, bounds, time);
  const live = [];
  for (let slot = 0; slot < points; slot++) {
    const age = time - trail[slot * 4 + 2];
    if (age < WAKE_LIFETIME) live.push({ x: trail[slot * 4], z: trail[slot * 4 + 1], age, speed: forces[slot * 4], thrust: forces[slot * 4 + 1] });
  }
  return { live, bounds };
}

describe("Ship wake", () => {
  test("Low retains a short fading trail and reduced-motion placement clears even a nearby cut", () => {
    const wake = createShipWake();
    wake.sail({ x: 0, z: 0 }, 0, 0, 0);
    const state = sail(wake, { z: 0, time: 0 }, 20, 2);
    const low = written(wake, state.time, 8);
    expect(low.live).toHaveLength(8);
    expect(low.live.some((point) => point.speed > 10)).toBe(true);
    expect(written(wake, state.time + WAKE_LIFETIME + 1, 8).live).toHaveLength(0);
    wake.place({ x: 0, z: state.z - 0.5 }, 0, state.time);
    expect(wake.frame().speed).toBe(0);
    expect(written(wake, state.time, 8).live.every((point) => point.speed === 0)).toBe(true);
  });
  test("the water answers a sudden start with inertia and a burst of thrust", () => {
    const wake = createShipWake();
    wake.sail({ x: 0, z: 0 }, 0, 0, 0);
    let state = sail(wake, { z: 0, time: 0 }, 60, 0.1);
    const early = wake.frame();
    expect(early.speed).toBeGreaterThan(0);
    expect(early.speed).toBeLessThan(30);
    expect(early.surge).toBeGreaterThan(0.2);
    state = sail(wake, state, 60, 2);
    const cruising = wake.frame();
    expect(cruising.speed).toBeCloseTo(60, 0);
    expect(Math.abs(cruising.surge)).toBeLessThan(0.05);
    expect(cruising.course.z).toBeCloseTo(-1, 5);
    sail(wake, state, 5, 0.3);
    expect(wake.frame().surge).toBeLessThan(0);
  });

  test("the trail stays where the Ship sailed and ages after it stops", () => {
    const wake = createShipWake();
    wake.sail({ x: 0, z: 0 }, 0, 0, 0);
    const state = sail(wake, { z: 0, time: 0 }, 20, 2);
    const moving = written(wake, state.time).live;
    expect(moving.length).toBeGreaterThan(10);
    // Oldest first, live head last, every point on the course behind the Ship.
    for (let index = 1; index < moving.length; index++) expect(moving[index].z).toBeLessThanOrEqual(moving[index - 1].z);
    expect(moving.at(-1)!.z).toBeCloseTo(state.z, 3);
    expect(moving.at(-1)!.age).toBeCloseTo(0, 5);

    // Idle for three seconds: nothing new is laid, and what was laid keeps its place.
    let time = state.time;
    for (let frame = 0; frame < 180; frame++) wake.sail({ x: 0, z: state.z }, 0, FRAME, (time += FRAME));
    const resting = written(wake, time).live;
    const committed = resting.slice(0, -1);
    expect(committed.map((point) => point.z)).toEqual(moving.slice(0, -1).map((point) => point.z));
    expect(Math.min(...committed.map((point) => point.age))).toBeGreaterThan(2.9);

    // Past its lifetime the trail is spent, and the shader's box is empty.
    for (let frame = 0; frame < 60 * WAKE_LIFETIME; frame++) wake.sail({ x: 0, z: state.z }, 0, FRAME, (time += FRAME));
    const spent = written(wake, time);
    expect(spent.live).toHaveLength(0);
    expect(spent.bounds[0]).toBeGreaterThan(spent.bounds[2]);
  });

  test("the disturbed water box covers the trail and its spreading arms", () => {
    const wake = createShipWake();
    wake.sail({ x: 0, z: 0 }, 0, 0, 0);
    const state = sail(wake, { z: 0, time: 0 }, 40, 1.5);
    const { bounds } = written(wake, state.time + 2);
    expect(bounds[0]).toBeLessThan(-5);
    expect(bounds[2]).toBeGreaterThan(5);
    expect(bounds[1]).toBeLessThan(state.z);
    expect(bounds[3]).toBeGreaterThan(0);
  });

  test("a cut leaves no wake behind", () => {
    const wake = createShipWake();
    wake.sail({ x: 0, z: 0 }, 0, 0, 0);
    const state = sail(wake, { z: 0, time: 0 }, 30, 1);
    wake.sail({ x: 40, z: -75 }, 0.4, FRAME, state.time + FRAME);
    const { live } = written(wake, state.time + FRAME);
    expect(live.every((point) => point.x === 40 && point.z === -75)).toBe(true);
    expect(wake.frame().speed).toBe(0);
    // Movement with no elapsed time, such as a chapter jump, is also a cut.
    wake.sail({ x: 41, z: -75 }, 0.4, 0, state.time + FRAME);
    expect(written(wake, state.time + FRAME).live.every((point) => point.x === 41)).toBe(true);
  });

  test("the course and rate of turn follow the direction of travel", () => {
    const wake = createShipWake();
    wake.sail({ x: 0, z: 0 }, 0, 0, 0);
    let time = 0;
    let angle = 0;
    const radius = 30;
    // Clockwise from above, the same sense as increasing heading.
    for (let frame = 0; frame < 120; frame++) {
      angle += (20 / radius) * FRAME;
      wake.sail({ x: radius - radius * Math.cos(angle), z: -radius * Math.sin(angle) }, angle, FRAME, (time += FRAME));
    }
    expect(wake.frame().turn).toBeCloseTo(20 / radius, 1);
    // Backing along a straight line points the course astern of the heading.
    for (let frame = 0; frame < 30; frame++) wake.sail({ x: 20, z: -20 + frame * 0.2 }, 0, FRAME, (time += FRAME));
    expect(wake.frame().course.z).toBeCloseTo(1, 5);
  });
});
