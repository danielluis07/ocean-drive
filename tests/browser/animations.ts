import type { Page } from "@playwright/test";

// Waits for finite CSS transitions and animations, such as the loading logo's
// fade-out or a Sheet sliding in, so colours and geometry are measured at rest.
// Endless pulses never settle and are ignored. Slower engines (WebKit and
// software rendering on CI) are still mid-transition when a fixed pause ends.
export async function settleAnimations(page: Page) {
  await page
    .waitForFunction(
      () => document.getAnimations().every((animation) =>
        animation.effect?.getTiming().iterations === Infinity || animation.playState !== "running"),
      undefined,
      { polling: 50, timeout: 5_000 },
    )
    // A transition that never ends is left for the measurement itself to report.
    .catch(() => undefined);
}
