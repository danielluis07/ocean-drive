import type { RefObject } from "react";
import { dragSteering } from "@/lib/guided-helm";

type HelmInput = {
  sailing: boolean;
  steering: RefObject<number>;
  targetHeading: RefObject<number | null>;
  onSuspend: () => void;
  onContextLoss: () => void;
};

// Listeners belong only to the canvas: labels, readers and controls never steer.
export function connectHelmInput(canvas: HTMLCanvasElement, input: HelmInput) {
  let pointer: { id: number; startX: number } | null = null;
  const keys = new Set<string>();
  const releasePointer = () => {
    const captured = pointer;
    pointer = null;
    if (captured && canvas.hasPointerCapture(captured.id)) canvas.releasePointerCapture(captured.id);
  };
  const reset = () => {
    releasePointer();
    keys.clear();
    input.steering.current = 0;
    input.targetHeading.current = null;
  };
  const down = (event: PointerEvent) => {
    if (!input.sailing || event.button !== 0 || !event.isPrimary || pointer) return;
    reset();
    pointer = { id: event.pointerId, startX: event.clientX };
    canvas.setPointerCapture(event.pointerId);
    canvas.focus({ preventScroll: true });
    event.preventDefault();
  };
  const move = (event: PointerEvent) => {
    if (!pointer || pointer.id !== event.pointerId) return;
    input.steering.current = dragSteering(event.clientX - pointer.startX);
    event.preventDefault();
  };
  const release = (event: PointerEvent) => {
    // Late capture loss or a second finger must not cancel a newer modality.
    if (pointer?.id === event.pointerId) reset();
  };
  const key = (event: KeyboardEvent) => {
    const name = event.key.toLowerCase();
    if (!["a", "d", "arrowleft", "arrowright"].includes(name) || !input.sailing) return;
    if (event.type === "keydown" && (event.altKey || event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    if (event.type === "keydown") {
      if (event.repeat && !keys.has(name)) return;
      releasePointer();
      keys.add(name);
    } else if (!keys.delete(name)) return;
    input.targetHeading.current = null;
    input.steering.current = Number(keys.has("d") || keys.has("arrowright"))
      - Number(keys.has("a") || keys.has("arrowleft"));
  };
  const suspend = () => { reset(); input.onSuspend(); };
  const hidden = () => { if (document.hidden) suspend(); };
  const lost = (event: Event) => { event.preventDefault(); reset(); input.onContextLoss(); };
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);
  canvas.addEventListener("lostpointercapture", release);
  canvas.addEventListener("keydown", key);
  canvas.addEventListener("keyup", key);
  canvas.addEventListener("blur", reset);
  canvas.addEventListener("webglcontextlost", lost);
  window.addEventListener("resize", reset);
  screen.orientation?.addEventListener("change", reset);
  window.addEventListener("blur", suspend);
  window.addEventListener("pagehide", suspend);
  document.addEventListener("visibilitychange", hidden);
  return () => {
    reset();
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", release);
    canvas.removeEventListener("pointercancel", release);
    canvas.removeEventListener("lostpointercapture", release);
    canvas.removeEventListener("keydown", key);
    canvas.removeEventListener("keyup", key);
    canvas.removeEventListener("blur", reset);
    canvas.removeEventListener("webglcontextlost", lost);
    window.removeEventListener("resize", reset);
    screen.orientation?.removeEventListener("change", reset);
    window.removeEventListener("blur", suspend);
    window.removeEventListener("pagehide", suspend);
    document.removeEventListener("visibilitychange", hidden);
  };
}
