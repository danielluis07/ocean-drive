import { expect, test } from "bun:test";
import { CALM_WAVE_RATE, CALM_WAVE_STRENGTH } from "@/lib/ocean-daylight";
import { sampleOceanHeight } from "@/lib/ocean-surface";

test("reduced-motion buoyancy lowers displacement and vertical speed across the route", () => {
  let normalTravel = 0;
  let calmTravel = 0;
  let normalPeak = 0;
  let calmPeak = 0;
  for (const [x, z] of [[0, 0], [-112, -12], [-224, 10], [-336, -8], [-448, 12]]) {
    for (let frame = 1; frame <= 1200; frame++) {
      const time = frame / 60;
      const previous = (frame - 1) / 60;
      const normal = sampleOceanHeight(x, z, time);
      const calm = sampleOceanHeight(x, z, time * CALM_WAVE_RATE, CALM_WAVE_STRENGTH);
      normalTravel += Math.abs(normal - sampleOceanHeight(x, z, previous));
      calmTravel += Math.abs(calm - sampleOceanHeight(x, z, previous * CALM_WAVE_RATE, CALM_WAVE_STRENGTH));
      normalPeak = Math.max(normalPeak, Math.abs(normal));
      calmPeak = Math.max(calmPeak, Math.abs(calm));
    }
  }
  expect(calmPeak).toBeLessThan(normalPeak * .5);
  expect(calmTravel).toBeLessThan(normalTravel * .2);
});
