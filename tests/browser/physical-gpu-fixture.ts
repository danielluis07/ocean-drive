import { test as base } from "@playwright/test";
import { spawn } from "node:child_process";
import { join } from "node:path";

type HostConditions = { displayAwake: boolean; nativeWindow: null | { process: number; pinned: boolean; primaryDisplay: boolean; requestedFocus: boolean; foreground: boolean; wasMinimized: boolean } };

// These controls belong to the physical lab, never the shipped application.
// A display going to sleep or an occluded native Firefox window is not an
// active five-minute render. Fixture teardown also runs after failures/skips.
export const test = base.extend<{ physicalHost: HostConditions | null }>({
  physicalHost: [async ({ page }, provide, testInfo) => {
    if (process.platform !== "win32") { await provide(null); return; }
    // Resolve the page fixture before selecting its owned native window.
    await page.bringToFront();
    const pin = testInfo.project.use.browserName === "firefox" && testInfo.project.use.headless === false;
    const child = spawn("powershell.exe", ["-NoProfile", "-File", join(process.cwd(), "tests/browser/physical-gpu-host.ps1"), "-OwnerProcess", String(process.pid), ...(pin ? ["-PinFirefox"] : [])], { windowsHide: true, stdio: "pipe" });
    let output = "", errors = "";
    const exited = new Promise<void>(resolve => child.once("close", () => resolve()));
    try {
      const conditions = await new Promise<HostConditions>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Physical host setup timed out")), pin ? 310_000 : 15_000);
        const fail = (error: Error) => { clearTimeout(timeout); reject(error); };
        child.once("error", fail);
        child.once("exit", code => fail(new Error(`Physical host setup exited ${code}: ${errors}`)));
        child.stderr.on("data", data => { errors += data.toString(); });
        child.stdout.on("data", data => {
          output += data.toString();
          if (!output.includes("\n")) return;
          clearTimeout(timeout);
          try { resolve(JSON.parse(output.split("\n")[0])); } catch (error) { reject(error); }
        });
      });
      await provide(conditions);
    } finally {
      child.stdin.end();
      const timeout = setTimeout(() => child.kill(), 2000);
      await exited;
      clearTimeout(timeout);
    }
  }, { auto: true, timeout: 320_000 }],
});
