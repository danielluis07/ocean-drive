import { expect, test } from "bun:test";
import { isPortraitViewport } from "@/lib/route-camera";
import { applyStageLayout, sameStageLayout, type StageLayout } from "@/lib/stage-layout";

const layout: StageLayout = {
  portrait: false,
  ship: { x: 465.2, y: 450, radius: 63 },
  landmark: { x: 223, y: 311, radius: 71 },
};

function fakeSurface() {
  const properties = new Map<string, string>();
  return {
    properties,
    element: {
      dataset: {} as Record<string, string>,
      style: {
        setProperty: (name: string, value: string) => void properties.set(name, value),
        removeProperty: (name: string) => void properties.delete(name),
      },
    } as unknown as HTMLElement,
  };
}

test("the Stop Card goes below the Ship only on portrait viewports, matching the camera", () => {
  expect(isPortraitViewport({ width: 390, height: 844 })).toBe(true);
  expect(isPortraitViewport({ width: 844, height: 390 })).toBe(false);
  expect(isPortraitViewport({ width: 600, height: 600 })).toBe(false);
  expect(isPortraitViewport({ width: 0, height: 0 })).toBe(false);
});

test("sub-pixel changes do not rewrite the layout", () => {
  expect(sameStageLayout(null, layout)).toBe(false);
  expect(sameStageLayout(layout, { ...layout, ship: { ...layout.ship, x: 465.4 } })).toBe(true);
  expect(sameStageLayout(layout, { ...layout, ship: { ...layout.ship, x: 470 } })).toBe(false);
  expect(sameStageLayout(layout, { ...layout, landmark: null })).toBe(false);
  expect(sameStageLayout(layout, { ...layout, portrait: true })).toBe(false);
});

test("the layout is written as rounded custom properties and a card side", () => {
  const surface = fakeSurface();
  applyStageLayout(surface.element, layout);
  expect(surface.element.dataset.cardSide).toBe("beside");
  expect(Object.fromEntries(surface.properties)).toEqual({
    "--ship-x": "465px",
    "--ship-y": "450px",
    "--ship-radius": "63px",
    "--landmark-x": "223px",
    "--landmark-y": "311px",
    "--landmark-radius": "71px",
  });
  // Open water has no Landmark, so its properties are removed.
  applyStageLayout(surface.element, { ...layout, portrait: true, landmark: null });
  expect(surface.element.dataset.cardSide).toBe("below");
  expect([...surface.properties.keys()]).toEqual(["--ship-x", "--ship-y", "--ship-radius"]);
});
