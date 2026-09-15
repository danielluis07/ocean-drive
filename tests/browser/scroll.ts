import type { Page } from "@playwright/test";

// Smooth focus scrolling is asynchronous in some engines (notably WebKit).
// Wait for the document to come to rest before measuring or pointing at it.
export async function settleScroll(page: Page) {
  let scroll = -1;
  for (let attempt = 0; attempt < 25; attempt++) {
    await page.waitForTimeout(80);
    const next = await page.evaluate(() => scrollY);
    if (next === scroll) return;
    scroll = next;
  }
}
