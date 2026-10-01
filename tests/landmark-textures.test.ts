import { describe, expect, test } from "bun:test";
import { LandmarkTextureCache } from "@/lib/landmark-textures";
import type { WebGLRenderer } from "three";
import landmarks from "@/content/landmarks.json";
import sharp from "sharp";

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("optional Landmark texture preparation", () => {
  test("late bytes wait through passages, upload only settled, and eviction closes bitmaps", async () => {
    const previousFetch = globalThis.fetch;
    const previousDecode = globalThis.createImageBitmap;
    let safe = false;
    let decodes = 0;
    let closes = 0;
    let uploads = 0;
    globalThis.fetch = (async () => new Response(new Blob(["texture"]))) as unknown as typeof fetch;
    globalThis.createImageBitmap = (async () => { decodes++; return { close: () => { closes++; } }; }) as unknown as typeof createImageBitmap;
    const cache = new LandmarkTextureCache({ initTexture: () => { expect(safe).toBe(true); uploads++; } } as unknown as WebGLRenderer, () => safe, () => {});
    const sources = landmarks.landmarks[0].textures.balanced;
    try {
      cache.retain([{ id: "one", sources }, { id: "two", sources }]);
      await flush();
      cache.prepare();
      expect(decodes).toBe(0);
      expect(uploads).toBe(0);
      safe = true;
      cache.prepare();
      await flush();
      safe = false;
      cache.prepare();
      expect(uploads).toBe(0);
      safe = true;
      cache.prepare();
      expect(uploads).toBe(4);
      expect(cache.get("one")).not.toBeNull();
      cache.retain([{ id: "two", sources }, { id: "three", sources }]);
      expect(cache.get("one")).toBeNull();
      expect(closes).toBe(2);
      cache.dispose();
      expect(closes).toBe(4);
    } finally {
      cache.dispose();
      globalThis.fetch = previousFetch;
      globalThis.createImageBitmap = previousDecode;
    }
  });

  test("failed requests leave the island usable without textures", async () => {
    const previous = globalThis.fetch;
    globalThis.fetch = (async () => new Response("missing", { status: 404 })) as unknown as typeof fetch;
    const cache = new LandmarkTextureCache({ initTexture: () => { throw new Error("Must not upload"); } } as unknown as WebGLRenderer, () => true, () => {});
    try {
      cache.retain([{ id: "missing", sources: landmarks.landmarks[0].textures.low }]);
      await flush();
      cache.prepare();
      expect(cache.get("missing")).toBeNull();
    } finally { cache.dispose(); globalThis.fetch = previous; }
  });
});

test("shipped terrain maps match their actual dimensions, size and tier allowances", async () => {
  for (const landmark of landmarks.landmarks) for (const tier of ["balanced", "low"] as const) {
    const entries = Object.entries(landmark.textures[tier]);
    expect(entries.map(([name]) => name)).toEqual(tier === "low" ? ["colour"] : ["colour", "normal"]);
    let bytes = 0;
    for (const [, record] of entries) {
      const file = Bun.file(`public${record.url}`);
      const image = await sharp(await file.arrayBuffer()).metadata();
      expect(image.width).toBe(tier === "low" ? 512 : 1024);
      expect(image.height).toBe(image.width);
      expect(file.size).toBe(record.bytes);
      bytes += file.size;
    }
    expect(bytes).toBeLessThanOrEqual(150 * 1024);
  }
});
