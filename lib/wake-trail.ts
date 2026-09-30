export type WakePoint = { x: number; z: number; birth: number; speed: number; thrust: number; turn: number; tail: number };

// Merge only runs that interpolate the same path, age and force as their
// recorded points. Checking every intermediate point prevents small bends from
// accumulating into a shortcut, and preserves acceleration, turns and tail fade.
function fits(points: readonly WakePoint[], first: number, last: number, expiredBefore: number) {
  const a = points[first], b = points[last];
  // Keep the original segment where the nine-second expiry crosses the trail.
  // A long merged span must not keep already-spent water alive at its old end.
  if ((a.birth <= expiredBefore) !== (b.birth <= expiredBefore)) return false;
  const dx = b.x - a.x, dz = b.z - a.z;
  const squared = dx * dx + dz * dz;
  if (squared < .001) return false;
  let previous = 0;
  for (let index = first + 1; index < last; index++) {
    const point = points[index];
    const along = ((point.x - a.x) * dx + (point.z - a.z) * dz) / squared;
    // A reversal cannot be replaced by a straight segment through itself.
    if (along <= previous || along >= 1) return false;
    previous = along;
    if (Math.hypot(point.x - a.x - dx * along, point.z - a.z - dz * along) > .02) return false;
    if (Math.abs(point.birth - (a.birth + (b.birth - a.birth) * along)) > .008) return false;
    if (Math.abs(point.speed - (a.speed + (b.speed - a.speed) * along)) > .5) return false;
    if (Math.abs(point.thrust - (a.thrust + (b.thrust - a.thrust) * along)) > .015) return false;
    if (Math.abs(point.turn - (a.turn + (b.turn - a.turn) * along)) > .01) return false;
    if (Math.abs(point.tail - (a.tail + (b.tail - a.tail) * along)) > .005) return false;
  }
  return true;
}

// Reuses the caller's scratch output and retains references to its samples.
// The live head and the original oldest point always survive; no history is
// thrown away, so a tier change can still read its own original trail length.
export function simplifyWakeTrail(points: readonly WakePoint[], output: WakePoint[], expiredBefore = -Infinity) {
  output.length = 0;
  if (points.length === 0) return;
  output.push(points[0]);
  let first = 0;
  while (first < points.length - 1) {
    let last = first + 1;
    while (last + 1 < points.length && fits(points, first, last + 1, expiredBefore)) last++;
    output.push(points[last]);
    first = last;
  }
}
