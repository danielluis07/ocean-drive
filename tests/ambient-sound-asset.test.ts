import { expect, test } from "bun:test";
import { ambientSoundBudget } from "@/lib/production-budgets";
import manifest from "@/content/asset-manifest.json";
import { assetSha256 } from "@/lib/asset-provenance";

test("ambient PCM loop has bounded levels, a continuous seam and recorded rights", async () => {
  const path = "public/audio/ocean-engine.v1.wav";
  const bytes = Buffer.from(await Bun.file(path).arrayBuffer());
  expect(bytes.length).toBeLessThanOrEqual(ambientSoundBudget);
  expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
  expect(bytes.readUInt16LE(22)).toBe(1);
  expect(bytes.readUInt32LE(24)).toBe(12000);
  let peak = 0;
  let energy = 0;
  let largestStep = 0;
  let previous = bytes.readInt16LE(bytes.length - 2) / 32768;
  for (let offset = 44; offset < bytes.length; offset += 2) {
    const sample = bytes.readInt16LE(offset) / 32768;
    peak = Math.max(peak, Math.abs(sample));
    energy += sample * sample;
    largestStep = Math.max(largestStep, Math.abs(sample - previous));
    previous = sample;
  }
  const rms = Math.sqrt(energy / ((bytes.length - 44) / 2));
  expect(peak).toBeLessThan(0.5);
  expect(rms).toBeGreaterThan(0.01);
  expect(rms * 0.22).toBeLessThan(0.025);
  const seam = Math.abs(bytes.readInt16LE(44) - bytes.readInt16LE(bytes.length - 2)) / 32768;
  expect(seam).toBeLessThan(largestStep);
  expect(seam).toBeLessThan(0.06);
  expect(manifest.assets.find(asset => asset.path === path)).toMatchObject({
    kind: "audio", essential: false, experience: true,
    sha256: await assetSha256(path), proof: "docs/third-party/ambient-sound.md",
  });
});
