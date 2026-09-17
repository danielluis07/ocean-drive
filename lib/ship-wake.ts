import type { RoutePoint } from "@/lib/charted-route";

// The Ship's wake as the ocean remembers it: a trail of world-space points, each
// recording how fast and how hard the Ship was driving as it passed. The ocean
// shader (lib/ocean-surface.ts) spreads, frays, and fades every point by its age,
// so the wake stays where it was made instead of travelling with the Ship.

// Mirrors WAKE_LIFETIME in the ocean shader.
export const WAKE_LIFETIME = 9;
// The longest trail any quality tier reads; lower tiers read its newest points.
export const WAKE_CAPACITY = 48;
// Reads as a Ship at full cruise; mirrors CRUISE_SPEED in the ocean shader.
export const CRUISE_SPEED = 60;

// Perceptual calibration, not hydrodynamics. Rates are per second.
const SPEED_RESPONSE = 4.5;
const SURGE_RESPONSE = 6;
const TURN_RESPONSE = 5;
// World units per second squared that read as full thrust.
const FULL_THRUST = 80;
const MAXIMUM_SURGE = 1.5;
// A Ship that moves further than this in one frame was placed, not sailed.
const CUT_DISTANCE = 8;
const SPACING_SECONDS = 0.09;
const MINIMUM_SPACING = 1.2;
const MAXIMUM_SPACING = 5;
const IDLE_EMISSION_SECONDS = 0.4;
const IDLE_EMISSION_DISTANCE = 0.2;
// Slots without a point are stamped long dead so the shader skips them.
const DEAD = -1e6;

type WakePoint = { x: number; z: number; birth: number; speed: number; thrust: number; turn: number };

export type WakeFrame = {
  // World units per second, smoothed so the water answers speed changes with inertia.
  speed: number;
  // Signed acceleration, where 1 is full thrust and negative values are braking.
  surge: number;
  // Signed rate of turn along the course, in radians per second.
  turn: number;
  // Unit direction of travel, which points astern when the Ship backs along the route.
  course: RoutePoint;
};

export type ShipWake = ReturnType<typeof createShipWake>;

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

function approach(value: number, target: number, rate: number, seconds: number) {
  return value + (target - value) * (1 - Math.exp(-rate * seconds));
}

// Kelvin's 19.5° wake half-angle narrows for fast hulls (Rabaud & Moisy, 2013):
// how quickly, in world units per second, a point's divergent crests move outward.
export function wakeSpread(speed: number) {
  return (0.354 * speed) / (1 + speed / 35);
}

// How far from its segment a trail point can still touch the water; mirrors the
// early exit in the ocean shader, with room for its noise displacement.
function wakeReach(speed: number, age: number) {
  const reach = 1.05 + wakeSpread(speed) * age;
  const width = 0.7 + age * 0.42 + reach * 0.05;
  const lane = 0.55 + Math.sqrt(age) * 0.95;
  return Math.max(reach + width * 3.8, lane * 3 + 1.2 + Math.sqrt(age) * 0.7);
}

export function createShipWake() {
  const points: WakePoint[] = Array.from({ length: WAKE_CAPACITY }, () => ({ x: 0, z: 0, birth: DEAD, speed: 0, thrust: 0, turn: 0 }));
  // The live point under the Ship, which is never older than the current frame.
  const head: WakePoint = { x: 0, z: 0, birth: DEAD, speed: 0, thrust: 0, turn: 0 };
  let newest = 0;
  let count = 0;
  let placed = false;
  let speed = 0;
  let surge = 0;
  let turn = 0;
  let course = 0;

  const commit = () => {
    newest = (newest + 1) % WAKE_CAPACITY;
    Object.assign(points[newest], head);
    count = Math.min(count + 1, WAKE_CAPACITY);
  };

  // Newest first: 0 is the last committed point.
  const committed = (back: number) => points[(newest - back + WAKE_CAPACITY) % WAKE_CAPACITY];

  const frame = (): WakeFrame => ({ speed, surge, turn, course: { x: Math.sin(course), z: -Math.cos(course) } });

  // A cut leaves no wake: the water forgets the old course and the Ship starts at rest.
  const place = (position: RoutePoint, heading: number, time: number) => {
    for (const point of points) point.birth = DEAD;
    Object.assign(head, { x: position.x, z: position.z, birth: time, speed: 0, thrust: 0, turn: 0 });
    count = 0;
    speed = surge = turn = 0;
    course = heading;
    placed = true;
    commit();
  };

  return {
    frame,
    // Records one frame in which `seconds` of sailing brought the Ship to `position`
    // at shader `time`. Movement without elapsed time is a cut.
    sail(position: RoutePoint, heading: number, seconds: number, time: number): WakeFrame {
      const dx = position.x - head.x;
      const dz = position.z - head.z;
      const moved = Math.hypot(dx, dz);
      if (!placed || moved > CUT_DISTANCE || (seconds <= 0 && moved > 1e-6)) {
        place(position, heading, time);
        return frame();
      }
      if (seconds <= 0) return frame();
      const previousSpeed = speed;
      speed = approach(speed, moved / seconds, SPEED_RESPONSE, seconds);
      surge = approach(surge, clamp((speed - previousSpeed) / seconds / FULL_THRUST, -MAXIMUM_SURGE, MAXIMUM_SURGE), SURGE_RESPONSE, seconds);
      if (moved > 1e-4) {
        // Same convention as route headings: 0 faces -Z.
        const nextCourse = Math.atan2(dx, -dz);
        turn = approach(turn, Math.atan2(Math.sin(nextCourse - course), Math.cos(nextCourse - course)) / seconds, TURN_RESPONSE, seconds);
        course = nextCourse;
      } else {
        turn = approach(turn, 0, TURN_RESPONSE, seconds);
      }
      // A resting Ship stops making new water: its live point ages like the rest,
      // so the trail settles instead of radiating from the hull forever.
      Object.assign(head, { x: position.x, z: position.z, birth: moved > 1e-5 ? time : head.birth, speed, thrust: Math.max(surge, 0), turn });
      const last = committed(0);
      const gap = Math.hypot(head.x - last.x, head.z - last.z);
      const spacing = clamp(speed * SPACING_SECONDS, MINIMUM_SPACING, MAXIMUM_SPACING);
      if (gap >= spacing || (gap >= IDLE_EMISSION_DISTANCE && time - last.birth >= IDLE_EMISSION_SECONDS)) commit();
      return frame();
    },
    // Fills the shader's trail oldest to newest with the live head last:
    // `trail` holds (x, z, birth, 0) and `forces` (speed, thrust, turn, tail fade)
    // per point. `bounds` receives the (min x, min z, max x, max z) box of water
    // the trail can still disturb at `time`, or an empty box.
    write(trail: Float32Array, forces: Float32Array, bounds: Float32Array, time: number) {
      const length = trail.length / 4;
      const available = Math.min(count, length - 1);
      let minX = Infinity;
      let minZ = Infinity;
      let maxX = -Infinity;
      let maxZ = -Infinity;
      let previous: WakePoint | null = null;
      for (let slot = 0; slot < length; slot++) {
        const back = length - 2 - slot;
        const real = slot === length - 1 || back < available;
        const point = slot === length - 1 ? head : committed(Math.min(back, available - 1));
        // The oldest points fade in so the trail never ends on a hard edge.
        const tail = Math.min(1, (available - (slot === length - 1 ? -1 : back) - 1) / 3);
        const offset = slot * 4;
        trail[offset] = point.x;
        trail[offset + 1] = point.z;
        trail[offset + 2] = real ? point.birth : DEAD;
        trail[offset + 3] = 0;
        forces[offset] = point.speed;
        forces[offset + 1] = point.thrust;
        forces[offset + 2] = point.turn;
        forces[offset + 3] = real ? Math.max(tail, 0) : 0;
        if (!real) continue;
        if (previous) {
          const age = time - Math.min(previous.birth, point.birth);
          // Mirrors the shader, which skips segments that are spent or span a long idle.
          if (time - Math.max(previous.birth, point.birth) < WAKE_LIFETIME && age < WAKE_LIFETIME * 2) {
            // Speed and age interpolate separately along a segment, so bound it by both maxima.
            const radius = wakeReach(Math.max(previous.speed, point.speed), Math.max(age, 0));
            minX = Math.min(minX, previous.x - radius, point.x - radius);
            minZ = Math.min(minZ, previous.z - radius, point.z - radius);
            maxX = Math.max(maxX, previous.x + radius, point.x + radius);
            maxZ = Math.max(maxZ, previous.z + radius, point.z + radius);
          }
        }
        previous = point;
      }
      const empty = minX === Infinity;
      bounds[0] = empty ? 1 : minX;
      bounds[1] = empty ? 1 : minZ;
      bounds[2] = empty ? -1 : maxX;
      bounds[3] = empty ? -1 : maxZ;
    },
  };
}
