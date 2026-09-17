// Where the settled Ship and its Landmark appear on screen, in CSS pixels
// relative to the ocean surface. The Stop Card stands clear of both: beside the
// Ship on landscape viewports and below it on portrait ones, matching the camera.

export type ScreenCircle = { x: number; y: number; radius: number };

export type StageLayout = {
  portrait: boolean;
  ship: ScreenCircle;
  landmark: ScreenCircle | null;
};

function sameCircle(a: ScreenCircle | null, b: ScreenCircle | null) {
  if (!a || !b) return a === b;
  return Math.round(a.x) === Math.round(b.x)
    && Math.round(a.y) === Math.round(b.y)
    && Math.round(a.radius) === Math.round(b.radius);
}

export function sameStageLayout(a: StageLayout | null, b: StageLayout) {
  return !!a && a.portrait === b.portrait && sameCircle(a.ship, b.ship) && sameCircle(a.landmark, b.landmark);
}

// Written as custom properties so frame updates never re-render React. The
// Landmark properties let layout checks confirm the card leaves it visible.
export function applyStageLayout(element: HTMLElement, layout: StageLayout) {
  element.dataset.cardSide = layout.portrait ? "below" : "beside";
  const circles = { ship: layout.ship, landmark: layout.landmark };
  for (const [name, circle] of Object.entries(circles)) {
    for (const axis of ["x", "y", "radius"] as const) {
      const property = `--${name}-${axis}`;
      if (circle) element.style.setProperty(property, `${Math.round(circle[axis])}px`);
      else element.style.removeProperty(property);
    }
  }
}
