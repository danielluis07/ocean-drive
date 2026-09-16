import { test as base } from "@playwright/test";

// Advance one frame at a time without catching up to a slow software GPU.
// This controls the browser clock, not the application's quality decisions.
// Dedicated resilience tests independently provide slow frames and failures.
export const test = base.extend({
  page: async ({ page }, providePage) => {
    await page.clock.install();
    await page.clock.pauseAt(new Date(Date.now() + 1000));
    let running = true;
    const frames = (async () => {
      while (running && !page.isClosed()) {
        // Batch ten 16 ms frames per browser round-trip without skipping frames.
        const startedAt = performance.now();
        // The clock spans the context, so a closing popup or scanner page may
        // reject one advance; only this page closing ends the loop.
        try { await page.clock.runFor(160); }
        catch (error) { if (page.isClosed()) break; if (!String(error).includes("closed")) throw error; }
        // Keep transient states observable at real-time pace without adding
        // another full delay on top of time already spent in software rendering.
        await new Promise((resolve) => setTimeout(resolve, Math.max(0, 160 - (performance.now() - startedAt))));
      }
    })();
    try { await providePage(page); }
    finally { running = false; await frames; }
  },
});

// Preserve CSS viewports and input coordinates while bounding software GPU work.
// Full-resolution physical performance is validated outside this journey suite.
test.use({ deviceScaleFactor: 0.25 });
