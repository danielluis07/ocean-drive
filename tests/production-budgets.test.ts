import { expect, test } from "bun:test";
import { checkBudgets, productionBudgets } from "@/lib/production-budgets";

test("budget gates reject missing evidence, excess transfer and inclusive scene limits", () => {
  expect(checkBudgets({})).toContain("routeJavaScript: missing or invalid measurement");
  const measurements = { ...productionBudgets };
  expect(checkBudgets(measurements)).toEqual([]);
  expect(checkBudgets({ ...measurements, routeJavaScript: 204801, drawCalls: 100, triangles: 150000, oceanDraws: 2, renderTargets: 3 })).toHaveLength(5);
  expect(checkBudgets({ ...measurements, fonts: NaN })).toEqual(["fonts: missing or invalid measurement"]);
  expect(checkBudgets({ ...measurements, minimumSailable: productionBudgets.minimumSailable + 1,
    minimumVisuals: productionBudgets.minimumVisuals + 1 })).toHaveLength(2);
});
