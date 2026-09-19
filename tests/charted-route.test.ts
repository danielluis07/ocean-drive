import { describe, expect, test } from "bun:test";
import {
  adjacentStopIndex,
  createChartedRoute,
  nearestStopIndex,
  poseAtProgress,
} from "@/lib/charted-route";
import { oceanConfiguration } from "@/lib/ocean-config";
import { stops } from "@/content/editorial";

const anchorages = oceanConfiguration.stops.map((stop) => ({ x: stop.anchorage[0], z: stop.anchorage[1] }));
const route = createChartedRoute(anchorages);

function headingDifference(a: number, b: number) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
}

describe("Charted Route progress mapping", () => {
  test("the route is charted through Stops 00 to 04 in order", () => {
    expect(oceanConfiguration.stops.map((stop) => stop.id)).toEqual(stops.map((stop) => stop.id));
    expect(stops.map((stop) => stop.id)).toEqual(["partida", "fernando-de-noronha", "boipeba", "abrolhos", "ilha-grande"]);
  });

  test("whole-number progress places the Ship exactly at each Stop's anchorage", () => {
    anchorages.forEach((anchorage, index) => {
      const { position } = poseAtProgress(route, index);
      expect(position.x).toBeCloseTo(anchorage.x, 6);
      expect(position.z).toBeCloseTo(anchorage.z, 6);
    });
  });

  test("progress is clamped to the route, so the Ship cannot leave either end", () => {
    expect(poseAtProgress(route, -3)).toEqual(poseAtProgress(route, 0));
    expect(poseAtProgress(route, 99)).toEqual(poseAtProgress(route, anchorages.length - 1));
    expect(poseAtProgress(route, Number.NaN)).toEqual(poseAtProgress(route, 0));
  });

  test("the path is continuous and evenly paced between Stops", () => {
    for (let segment = 0; segment < anchorages.length - 1; segment++) {
      const steps: number[] = [];
      let previous = poseAtProgress(route, segment).position;
      for (let fraction = 0.05; fraction <= 1.0001; fraction += 0.05) {
        const next = poseAtProgress(route, segment + fraction).position;
        steps.push(Math.hypot(next.x - previous.x, next.z - previous.z));
        previous = next;
      }
      const mean = steps.reduce((sum, step) => sum + step, 0) / steps.length;
      for (const step of steps) expect(Math.abs(step - mean) / mean).toBeLessThan(0.05);
    }
  });

  test("the Ship's heading follows the direction of travel along the path", () => {
    for (let progress = 0.01; progress < anchorages.length - 1.01; progress += 0.1) {
      const here = poseAtProgress(route, progress);
      const ahead = poseAtProgress(route, progress + 0.01).position;
      const travel = Math.atan2(ahead.x - here.position.x, -(ahead.z - here.position.z));
      expect(Math.abs(headingDifference(here.heading, travel))).toBeLessThan(0.05);
    }
  });
});

describe("Stop selection", () => {
  test.each([
    [0.49, 0],
    [0.5, 1],
    [2.2, 2],
    [3.7, 4],
    [-1, 0],
    [9, 4],
  ])("nearest Stop to progress %p is %p", (progress, stop) => {
    expect(nearestStopIndex(route, progress)).toBe(stop);
  });

  test.each([
    [0, 1, 1],
    [1, 1, 2],
    [1, -1, 0],
    [1.4, 1, 2],
    [1.4, -1, 1],
    [1.9, 1, 2],
    [1.9999999, 1, 3],
    [4, 1, 4],
    [0, -1, 0],
  ] as const)("from progress %p, direction %p moves to Stop %p", (progress, direction, stop) => {
    expect(adjacentStopIndex(route, progress, direction)).toBe(stop);
  });
});
