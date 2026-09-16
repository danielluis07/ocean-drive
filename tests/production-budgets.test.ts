import { expect, test } from "bun:test";
import { checkBudgets } from "@/lib/production-budgets";

test("budget gates reject missing evidence, excess transfer and inclusive scene limits", () => {
  expect(checkBudgets({})).toContain("routeJavaScript: missing or invalid measurement");
  const measurements = { routeJavaScript: 200 * 1024, lazyThreeJavaScript: 350 * 1024, minimumSailable: 1.5 * 1024 ** 2,
    completeVisit: 5 * 1024 ** 2, minimumVisuals: 500 * 1024, allVisuals: 750 * 1024, fonts: 160 * 1024,
    drawCalls: 99, triangles: 149999, oceanDraws: 1, renderTargets: 1 };
  expect(checkBudgets(measurements)).toEqual([]);
  expect(checkBudgets({ ...measurements, routeJavaScript: 204801, drawCalls: 100, triangles: 150000, oceanDraws: 2, renderTargets: 2 })).toHaveLength(5);
  expect(checkBudgets({ ...measurements, fonts: NaN })).toEqual(["fonts: missing or invalid measurement"]);
});
