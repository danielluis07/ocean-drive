export const productionBudgets = {
  routeJavaScript: 200 * 1024,
  lazyThreeJavaScript: 350 * 1024,
  minimumSailable: 1.5 * 1024 ** 2,
  completeVisit: 5 * 1024 ** 2,
  minimumVisuals: 500 * 1024,
  allVisuals: 750 * 1024,
  fonts: 160 * 1024,
  drawCalls: 99,
  triangles: 149_999,
  oceanDraws: 1,
  renderTargets: 1,
} as const;

export function checkBudgets(measurements: Partial<Record<keyof typeof productionBudgets, number>>) {
  return Object.entries(productionBudgets).flatMap(([name, limit]) => {
    const value = measurements[name as keyof typeof productionBudgets];
    if (value === undefined || !Number.isFinite(value) || value < 0) return [`${name}: missing or invalid measurement`];
    return value > limit ? [`${name}: ${value} exceeds ${limit}`] : [];
  });
}
