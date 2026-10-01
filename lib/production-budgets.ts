export const productionBudgets = {
  routeJavaScript: 200 * 1024,
  lazyThreeJavaScript: 350 * 1024,
  minimumSailable: 1.5 * 1024 ** 2,
  completeVisit: 5 * 1024 ** 2,
  // Each admits the 30 KiB shared Feature file that Balanced and High request
  // with their Landmarks. See docs/landmarks.md.
  minimumVisuals: 530 * 1024,
  allVisuals: 780 * 1024,
  fonts: 160 * 1024,
  drawCalls: 99,
  triangles: 149_999,
  oceanDraws: 1,
  // High/Balanced retain the vessel's environment and the wake field; Low retains
  // neither. See docs/ocean-resilience.md.
  renderTargets: 2,
} as const;

export function checkBudgets(measurements: Partial<Record<keyof typeof productionBudgets, number>>) {
  return Object.entries(productionBudgets).flatMap(([name, limit]) => {
    const value = measurements[name as keyof typeof productionBudgets];
    if (value === undefined || !Number.isFinite(value) || value < 0) return [`${name}: missing or invalid measurement`];
    return value > limit ? [`${name}: ${value} exceeds ${limit}`] : [];
  });
}
