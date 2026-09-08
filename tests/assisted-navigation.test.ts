import { expect, test } from "bun:test";
import { advanceStationJourney, type StationNavigation } from "@/lib/station-approach";
import { oceanConfiguration } from "@/lib/ocean-config";
import type { VesselPose } from "@/lib/expedition-state";
import { reorientVessel } from "@/lib/assisted-return";

function trace(initial: VesselPose, seconds: number, sailing = true, previous?: StationNavigation, steering = 0) {
  let pose = initial;
  let navigation: StationNavigation = previous ?? { departedStation: null, arrivalPending: false };
  for (let frame = 0; frame < seconds * 20; frame++) {
    const next = advanceStationJourney(pose, navigation, {
      stations: oceanConfiguration.stations, availableStations: ["pulso-de-calor"],
      sailing, steering, targetHeading: null, seconds: 0.05,
    });
    pose = next.pose;
    navigation = next.navigation;
  }
  return { pose, navigation };
}

test("assistance strengthens bearings before offering reorientation, only during observed non-progress", () => {
  const away = { position: { x: 0, z: 0 }, heading: Math.PI };
  const bearings = trace(away, 8);
  expect(bearings.navigation.assistance?.stage).toBe("bearings");
  const offer = trace(bearings.pose, 8, true, bearings.navigation);
  expect(offer.navigation.assistance?.stage).toBe("reorient");
  const paused = trace(offer.pose, 60, false, offer.navigation);
  expect(paused).toEqual(offer);
  const progressing = trace({ ...away, heading: 0 }, 8);
  expect(progressing.navigation.assistance?.stage).toBe("none");
});

test.each([1, -1, 0.5, -0.5, 0.2, -0.2])("repeated circles at steering %s qualify as non-progress despite temporary improvements in bearing", (steering) => {
  const circles = trace({ position: { x: 0, z: 0 }, heading: 0 }, 120, true, undefined, steering);
  expect(circles.navigation.assistance?.stage).toBe("reorient");
  const corrected = trace({ ...circles.pose, heading: 0 }, 2, true, circles.navigation);
  expect(corrected.navigation.assistance?.stage).toBe("none");
});

test("a meaningful course correction resets assistance and reorientation never transports or pilots the vessel", () => {
  const lost = trace({ position: { x: 0, z: 0 }, heading: Math.PI }, 16);
  const reoriented = reorientVessel(lost.pose, [oceanConfiguration.stations[0]]);
  expect(reoriented.position).toEqual(lost.pose.position);
  expect(reoriented.heading).toBeCloseTo(0);
  const corrected = trace({ ...lost.pose, heading: Math.PI / 2 }, 0.05, true, lost.navigation);
  expect(corrected.navigation.assistance?.stage).toBe("none");
  const manual = trace({ ...reoriented, heading: 0.5 }, 2, true, lost.navigation);
  expect(manual.pose.heading).toBe(0.5);
  expect(manual.navigation.assistance?.stage).toBe("none");
});

test("the boundary current curves an outward vessel inward without a position clamp or a stalled frame jump", () => {
  const outside = { position: { x: 0, z: 56 }, heading: Math.PI };
  const first = trace(outside, 0.05);
  expect(first.navigation.boundaryReturning).toBe(true);
  expect(first.pose.position.z).toBeGreaterThan(outside.position.z);
  expect(Math.abs(first.pose.heading - outside.heading)).toBeLessThan(0.06);
  const returning = trace(first.pose, 10, true, first.navigation);
  expect(returning.pose.position.z).toBeLessThan(outside.position.z);
  expect(returning.navigation.boundaryReturning).toBe(false);
  const frozen = trace(first.pose, 60, false, first.navigation);
  expect(frozen).toEqual(first);
  const stalled = advanceStationJourney(outside, { departedStation: null, arrivalPending: false }, {
    stations: oceanConfiguration.stations, availableStations: ["pulso-de-calor"], sailing: true,
    steering: 0, targetHeading: null, seconds: 600,
  });
  expect(stalled.pose).toEqual(first.pose);
});

test("renewed progress toward either middle choice clears assistance without choosing a route", () => {
  const previous = trace({ position: { x: 0, z: 0 }, heading: Math.PI }, 16).navigation;
  for (const heading of [-0.6, 0.6]) {
    const next = advanceStationJourney({ position: { x: 0, z: -50 }, heading }, { ...previous, departedStation: "pulso-de-calor" }, {
      stations: oceanConfiguration.stations,
      availableStations: ["pulso-de-calor", "corais-sob-estresse", "respostas-desiguais"], completedStations: ["pulso-de-calor"],
      sailing: true, steering: 0, targetHeading: null, seconds: 0.05,
    });
    expect(next.navigation.assistance?.stage).toBe("none");
    expect(next.pose.heading).toBe(heading);
    expect(next.arrived).toBeUndefined();
  }
});
