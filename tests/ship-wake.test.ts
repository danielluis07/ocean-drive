import { describe, expect, test } from "bun:test";
import { qualityEnvelope } from "@/lib/ocean-quality";
import { createShipWake, cruiseWake, CRUISE_SPEED, WAKE_CAPACITY, WAKE_LIFETIME } from "@/lib/ship-wake";
import { placeWakeField, WAKE_FIELD_SIZE } from "@/lib/wake-field";

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

  test("a forgotten trail leaves no water behind and the next frame places the Ship afresh", () => {
    const wake = createShipWake();
    wake.sail({ x: 0, z: 0 }, 0, 0, 0);
    const state = sail(wake, { z: 0, time: 0 }, 40, 1.5);
    wake.forget();
    const forgotten = written(wake, state.time);
    expect(forgotten.live).toHaveLength(0);
    expect(forgotten.bounds[0]).toBeGreaterThan(forgotten.bounds[2]);
    wake.sail({ x: 0, z: state.z - 0.5 }, 0, FRAME, state.time + FRAME);
    expect(wake.frame().speed).toBe(0);
    const placed = written(wake, state.time + FRAME).live;
    expect(placed.length).toBeGreaterThan(0);
    for (const point of placed) expect(point).toMatchObject({ z: Math.fround(state.z - 0.5), speed: 0 });
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

test("the warm-up's cruise wake fills every trail slot astern of the Ship", () => {
  const time = 42;
  const wake = cruiseWake({ x: 10, z: 20 }, Math.PI / 2, time);
  const { live, bounds } = written(wake, time, WAKE_CAPACITY);
  expect(live).toHaveLength(WAKE_CAPACITY);
  // Heading π/2 faces +X, so the trail lies to the Ship's -X and ends under it.
  expect(live.at(-1)).toMatchObject({ x: 10, z: 20, age: 0 });
  expect(live.every((point) => point.x <= 10 + 1e-3 && Math.abs(point.z - 20) < 1e-3)).toBe(true);
  expect(Math.min(...live.map((point) => point.x))).toBeLessThan(10 - 200);
  expect(live.every((point) => point.age < WAKE_LIFETIME)).toBe(true);
  expect(wake.frame().speed).toBeGreaterThan(CRUISE_SPEED * 0.95);
  expect(bounds[2]).toBeGreaterThan(bounds[0]);
});

describe("wake field", () => {
  const tiers = ["high", "balanced"] as const;
  // The field covers the disturbed water with the texel the field pass pads it by on every side.
  function covers(origin: { x: number; z: number }, bounds: Float32Array, texels: number) {
    const texel = WAKE_FIELD_SIZE / texels;
    return bounds[0] - texel >= origin.x && bounds[1] - texel >= origin.z
      && bounds[2] + texel <= origin.x + WAKE_FIELD_SIZE && bounds[3] + texel <= origin.z + WAKE_FIELD_SIZE;
  }
  function boundsOf(wake: ReturnType<typeof createShipWake>, time: number, points: number) {
    const bounds = new Float32Array(4);
    wake.write(new Float32Array(points * 4), new Float32Array(points * 4), bounds, time);
    return bounds;
  }

  for (const tier of tiers) {
    test(`${tier} holds the heaviest wake whole, in any direction and as it ages`, () => {
      const { wakePoints, wakeTexels } = qualityEnvelope[tier];
      for (const heading of [0, Math.PI / 4, Math.PI / 2, 2.4]) {
        const ship = { x: 130.4, z: -71.9 };
        const wake = cruiseWake(ship, heading, 50);
        for (let time = 50; time < 60; time += 0.25) {
          const bounds = boundsOf(wake, time, wakePoints);
          if (bounds[0] > bounds[2]) continue;
          expect(covers(placeWakeField(bounds, ship, wakeTexels)!, bounds, wakeTexels)).toBe(true);
        }
      }
      // A slow Ship lays a short trail that lives its whole nine seconds.
      const slow = createShipWake();
      slow.sail({ x: 0, z: 0 }, 0, 0, 0);
      const state = sail(slow, { z: 0, time: 0 }, 12, 8);
      const bounds = boundsOf(slow, state.time, wakePoints);
      expect(covers(placeWakeField(bounds, { x: 0, z: state.z }, wakeTexels)!, bounds, wakeTexels)).toBe(true);
    });
  }

  test("the field snaps to whole texels, so the ranking holds still in the water", () => {
    const texels = qualityEnvelope.balanced.wakeTexels;
    const texel = WAKE_FIELD_SIZE / texels;
    const first = placeWakeField([-40.3, -120.2, 12.6, 3.1], { x: 0, z: 0 }, texels)!;
    const nudged = placeWakeField([-40.1, -120.5, 12.9, 2.9], { x: 0, z: -0.3 }, texels)!;
    for (const origin of [first, nudged]) {
      expect(Math.abs(origin.x / texel - Math.round(origin.x / texel))).toBeLessThan(1e-9);
      expect(Math.abs(origin.z / texel - Math.round(origin.z / texel))).toBeLessThan(1e-9);
    }
    expect(Math.abs(first.x - nudged.x)).toBeLessThanOrEqual(texel);
    expect(Math.abs(first.z - nudged.z)).toBeLessThanOrEqual(texel);
  });

  test("water larger than the field keeps the stretch around the Ship", () => {
    const texels = qualityEnvelope.high.wakeTexels;
    const ship = { x: 480, z: 10 };
    const origin = placeWakeField([-20, 0, 500, 20], ship, texels)!;
    // Snapping moves the field down by less than a texel.
    expect(ship.x - origin.x).toBeGreaterThanOrEqual(96);
    expect(origin.x + WAKE_FIELD_SIZE - ship.x).toBeGreaterThanOrEqual(96 - WAKE_FIELD_SIZE / texels);
    expect(placeWakeField([1, 1, -1, -1], ship, texels)).toBeNull();
  });
});
