import { expect, test } from "@playwright/test";
import { createInitialVoyageState, serializeVoyageState } from "@/lib/voyage-state";

for (const tier of ["balanced", "low"] as const) {
  test(`${tier} prepares optional terrain after entry and keeps only two Landmarks`, async ({ page }) => {
    if (tier === "low") await page.setViewportSize({ width: 390, height: 844 });
    const requests: string[] = [];
    page.on("request", (request) => { if (request.url().includes("/textures/landmark-")) requests.push(request.url()); });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.addInitScript((state) => {
      sessionStorage.setItem("ocean-drive:diagnostics", "enabled");
      sessionStorage.setItem("ocean-drive:voyage:v1", state);
      const decode = window.createImageBitmap.bind(window);
      const orientations: ImageOrientation[] = [];
      Object.assign(window, { terrainOrientations: orientations });
      window.createImageBitmap = ((source: ImageBitmapSource, options?: ImageBitmapOptions) => {
        if (source instanceof Blob && source.type === "image/webp") orientations.push(options?.imageOrientation ?? "from-image");
        return decode(source, options);
      }) as typeof createImageBitmap;
    }, serializeVoyageState({ ...createInitialVoyageState(), qualityPreference: tier === "low" ? "reduced-3d" : "automatic" }));
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    await page.route("**/textures/landmark-*.webp", async (route) => { await held; await route.continue(); });
    const ocean = page.locator("#voyage-ocean");
    try {
      await page.goto("/");
      await expect(ocean).toHaveAttribute("data-stage", "ready");
      await expect(page.locator('[data-slot="ocean-loading"]')).toBeHidden();
      await expect(ocean).toHaveAttribute("data-quality", tier);
    } finally { release(); }
    for (let stop = 1; stop <= 4; stop++) {
      await page.keyboard.press("PageDown");
      await expect(ocean).toHaveAttribute("data-settled-stop", String(stop));
      await expect.poll(async () => page.evaluate((id) => {
        const report = JSON.parse(window.__oceanDiagnostics!.exportJSON());
        return report.events.some((event: { kind: string; detail: string }) => event.kind === "landmark-texture" &&
          JSON.parse(event.detail).action === "upload" && JSON.parse(event.detail).id === id);
      }, ["fernando-de-noronha", "boipeba", "abrolhos", "ilha-grande"][stop - 1])).toBe(true);
    }
    const events = await page.evaluate(() => JSON.parse(window.__oceanDiagnostics!.exportJSON()).events
      .filter((event: { kind: string }) => event.kind === "landmark-texture").map((event: { detail: string }) => JSON.parse(event.detail)));
    expect(events.every((event: { retained: number }) => event.retained <= 2)).toBe(true);
    expect(events.some((event: { action: string }) => event.action === "release")).toBe(true);
    // Use the app's decode options on an asymmetric bake: row zero is minZ,
    // whose mesh UV is v=0. Read the uploaded texture at that coordinate.
    const sampledRows = await page.evaluate(async () => {
      const orientations = (window as unknown as { terrainOrientations: ImageOrientation[] }).terrainOrientations;
      const source = document.createElement("canvas");
      source.width = 1; source.height = 2;
      const paint = source.getContext("2d")!;
      paint.fillStyle = "red"; paint.fillRect(0, 0, 1, 1);
      paint.fillStyle = "blue"; paint.fillRect(0, 1, 1, 1);
      const blob = await new Promise<Blob>((resolve) => source.toBlob((value) => resolve(value!), "image/png"));
      const gl = document.createElement("canvas").getContext("webgl2")!;
      const texture = gl.createTexture();
      const framebuffer = gl.createFramebuffer();
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
      const samples: number[][] = [];
      for (const imageOrientation of new Set(orientations)) {
        const bitmap = await createImageBitmap(blob, { imageOrientation, colorSpaceConversion: "none" });
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("Texture framebuffer incomplete");
        const pixel = new Uint8Array(4);
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        samples.push(Array.from(pixel));
        bitmap.close();
      }
      gl.deleteFramebuffer(framebuffer);
      gl.deleteTexture(texture);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      return samples;
    });
    expect(sampledRows.length).toBeGreaterThan(0);
    expect(sampledRows).toEqual(sampledRows.map(() => [255, 0, 0, 255]));
    if (tier === "low") {
      expect(requests.every((url) => url.includes("-low-colour."))).toBe(true);
    } else {
      expect(requests.some((url) => url.includes("-balanced-normal."))).toBe(true);
    }
  });
}

test("missing terrain textures never prevent entry or reaching every Stop", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/textures/landmark-*.webp", (route) => route.fulfill({ status: 404, body: "missing" }));
  await page.goto("/");
  const ocean = page.locator("#voyage-ocean");
  await expect(ocean).toHaveAttribute("data-stage", "ready");
  await expect(page.locator('[data-slot="ocean-loading"]')).toBeHidden();
  for (let stop = 1; stop <= 4; stop++) {
    await page.keyboard.press("PageDown");
    await expect(ocean).toHaveAttribute("data-settled-stop", String(stop));
    await expect(ocean).toHaveAttribute("data-stage", "ready");
  }
});
