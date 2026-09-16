import type { RouteMotion } from "@/lib/route-motion";

// Calibration: how much wheel or finger travel sails the Ship one Stop.
const WHEEL_PIXELS_PER_STOP = 700;
const TOUCH_VIEWPORT_PER_STOP = 0.6;
const LINE_HEIGHT = 16;

const forwardKeys = new Set(["ArrowDown", "ArrowRight", "PageDown"]);
const backwardKeys = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);

type RouteInput = {
  route: () => RouteMotion | null;
  // Read at event time, so the listeners stay connected across state changes.
  enabled: () => boolean;
};

export function wheelPixels(event: Pick<WheelEvent, "deltaX" | "deltaY" | "deltaMode">, pageHeight: number) {
  const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
  if (event.deltaMode === 1) return delta * LINE_HEIGHT;
  if (event.deltaMode === 2) return delta * pageHeight;
  return delta;
}

function isEditable(target: EventTarget | null) {
  return target instanceof HTMLElement
    && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName));
}

// Wheel and touch belong to the ocean surface; keys work anywhere on the page
// outside form fields. Nothing here steers: input only moves along the route.
export function connectRouteInput(surface: HTMLElement, input: RouteInput) {
  let touch: { id: number; y: number } | null = null;

  const wheel = (event: WheelEvent) => {
    // Pinch-zoom arrives as a ctrl+wheel and remains the browser's.
    if (event.ctrlKey || !input.enabled()) return;
    const route = input.route();
    if (!route) return;
    event.preventDefault();
    route.scroll(wheelPixels(event, innerHeight) / WHEEL_PIXELS_PER_STOP, performance.now());
  };
  const down = (event: PointerEvent) => {
    if (event.pointerType !== "touch" || !event.isPrimary || !input.enabled()) return;
    touch = { id: event.pointerId, y: event.clientY };
  };
  const move = (event: PointerEvent) => {
    const route = input.route();
    if (!touch || touch.id !== event.pointerId || !route || !input.enabled()) return;
    // Swiping up sails forward, like scrolling a page.
    route.scroll((touch.y - event.clientY) / (innerHeight * TOUCH_VIEWPORT_PER_STOP), performance.now());
    touch.y = event.clientY;
  };
  const up = (event: PointerEvent) => {
    if (touch?.id === event.pointerId) touch = null;
  };
  const key = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const direction = forwardKeys.has(event.key) ? 1 : backwardKeys.has(event.key) ? -1 : 0;
    const route = input.route();
    if (!direction || !route || isEditable(event.target) || !input.enabled()) return;
    event.preventDefault();
    route.step(direction);
  };
  const release = () => {
    touch = null;
    input.route()?.release();
  };

  surface.addEventListener("wheel", wheel, { passive: false });
  surface.addEventListener("pointerdown", down);
  surface.addEventListener("pointermove", move);
  surface.addEventListener("pointerup", up);
  surface.addEventListener("pointercancel", up);
  document.addEventListener("keydown", key);
  window.addEventListener("blur", release);
  window.addEventListener("pagehide", release);
  return () => {
    surface.removeEventListener("wheel", wheel);
    surface.removeEventListener("pointerdown", down);
    surface.removeEventListener("pointermove", move);
    surface.removeEventListener("pointerup", up);
    surface.removeEventListener("pointercancel", up);
    document.removeEventListener("keydown", key);
    window.removeEventListener("blur", release);
    window.removeEventListener("pagehide", release);
  };
}
