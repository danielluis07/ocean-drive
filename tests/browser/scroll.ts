import type { Page } from "@playwright/test";

// Smooth focus scrolling is asynchronous in some engines (notably WebKit).
// Wait for the document to come to rest before measuring or pointing at it.
// WebKit can hold a long smooth scroll still for a moment before it starts, so
// the position must stay unchanged across three consecutive samples.
export async function settleScroll(page: Page) {
  let scroll = -1;
  let steady = 0;
  for (let attempt = 0; attempt < 40; attempt++) {
    await page.waitForTimeout(80);
    const next = await page.evaluate(() => scrollY);
    steady = next === scroll ? steady + 1 : 0;
    if (steady === 2) return;
    scroll = next;
  }
}
