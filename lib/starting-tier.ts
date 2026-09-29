import { qualityEnvelope, type QualityTier, type StartingQuality } from "@/lib/ocean-quality";

// Where the ocean starts before any frame is measured. Three signals, most
// trusted first: what this device settled on last visit, a warm-up benchmark
// during the Approach (lib/ocean-quality.ts), and a coarse GPU class read from
// the renderer string. Live measurement stays authoritative after any of them.
//
// The renderer string is a fingerprinting surface. It is read only here, only
// to pick a tier, and never leaves the page: storage keys hold a hash of it.

export type GpuClass = "modest" | "capable";
export type StartingSource = "remembered" | "gpu-class" | "default";

const STORAGE_PREFIX = "ocean-drive:quality:";
const tiers: QualityTier[] = ["low", "balanced", "high"];

// Integrated and mobile GPUs that hold Balanced at rest but not through a passage.
const modestRenderers = [
  /\bIntel\b.*\b(U?HD|Iris)\b/i,
  /\bVega\s*\d{1,2}\s+Graphics\b/i,
  /\bRadeon\(TM\)\s+Graphics\b/i,
  /\bMali-(G[1-5]\d|T\d)/i,
  /\bAdreno\b\D*[1-5]\d\d\b/i,
  /\bPowerVR\b/i,
];
// Recent discrete GPUs and Apple's larger chips.
const capableRenderers = [/\bRTX\b/i, /\bRadeon\b.*\bRX\s*[5-9]\d{3}\b/i, /\bApple M\d+ (Pro|Max|Ultra)\b/i];

// Masked or generic strings ("WebKit WebGL", "Apple GPU", "Mozilla") and
// software renderers classify as nothing. Software rendering never reaches a
// Visitor: the eligibility probe asks the browser to refuse it.
export function classifyRenderer(renderer: string | null): GpuClass | null {
  if (!renderer) return null;
  if (capableRenderers.some((pattern) => pattern.test(renderer))) return "capable";
  if (modestRenderers.some((pattern) => pattern.test(renderer))) return "modest";
  return null;
}

// Chrome masks RENDERER as "WebKit WebGL" and needs the debug extension, which
// Firefox deprecates with a console warning, so it is asked only when masked.
export function readRenderer(context: WebGLRenderingContext | WebGL2RenderingContext): string | null {
  try {
    const plain = context.getParameter(context.RENDERER);
    if (typeof plain === "string" && plain !== "WebKit WebGL") return plain;
    const debug = context.getExtension("WEBGL_debug_renderer_info");
    const unmasked = debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null;
    return typeof unmasked === "string" ? unmasked : null;
  } catch {
    return null;
  }
}

// FNV-1a: small, synchronous, and enough to tell one device's setups apart.
function hash(text: string) {
  let value = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 0x01000193);
  }
  return (value >>> 0).toString(36);
}

// The same GPU on another screen, or at another zoom, can settle elsewhere.
export function deviceKey(renderer: string | null, screen: { width: number; height: number }, dpr: number) {
  return STORAGE_PREFIX + hash(`${renderer ?? ""}|${screen.width}x${screen.height}|${dpr}`);
}

// `storage` is a getter because reading `localStorage` itself can throw.
export function recallQuality(storage: () => Storage, key: string): StartingQuality | null {
  try {
    const stored = JSON.parse(storage().getItem(key) ?? "null") as Partial<StartingQuality> | null;
    if (!stored || !tiers.includes(stored.tier as QualityTier)) return null;
    const dpr = stored.dpr;
    if (typeof dpr !== "number" || dpr < qualityEnvelope.low.minDpr || dpr > qualityEnvelope.high.maxDpr) return null;
    return { tier: stored.tier as QualityTier, dpr };
  } catch {
    return null;
  }
}

export function rememberQuality(storage: () => Storage, key: string, quality: StartingQuality) {
  try {
    storage().setItem(key, JSON.stringify({ tier: quality.tier, dpr: quality.dpr }));
  } catch {
    // A per-device convenience: without storage, the next visit starts from hints.
  }
}

// A modest GPU starts where the controller would take it after its first
// passage: Low effects at Balanced sharpness. A capable one starts on High, but
// not on a phone-sized or touch-first screen. The hint never forces text mode:
// only measured Low frames can.
export function startingQuality(device: {
  coarsePointer: boolean;
  smallScreen: boolean;
  deviceDpr: number;
  remembered: StartingQuality | null;
  gpuClass: GpuClass | null;
}): { start: StartingQuality | null; source: StartingSource } {
  if (device.remembered) return { start: device.remembered, source: "remembered" };
  const handheld = device.coarsePointer || device.smallScreen;
  if (device.gpuClass === "modest")
    return { start: { tier: "low", dpr: handheld ? qualityEnvelope.low.maxDpr : qualityEnvelope.balanced.maxDpr }, source: "gpu-class" };
  if (device.gpuClass === "capable" && !handheld)
    return { start: { tier: "high", dpr: qualityEnvelope.high.maxDpr }, source: "gpu-class" };
  return { start: null, source: "default" };
}
