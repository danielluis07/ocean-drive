import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Next evaluates configuration in multiple workers. Content, not wall time,
// must identify the same build in BUILD_ID and the browser's diagnostic export.
export function sourceFingerprint() {
  const hash = createHash("sha256");
  function visit(path: string) {
    for (const entry of readdirSync(path, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) visit(child);
      else {
        hash.update(child.replaceAll("\\", "/"));
        const bytes = readFileSync(child);
        hash.update(/\.(woff2|png|glb)$/.test(child) ? bytes : bytes.toString("utf8").replaceAll("\r\n", "\n"));
      }
    }
  }
  for (const directory of ["app", "components", "content", "fonts", "lib", "providers", "public", "scripts"]) visit(directory);
  for (const file of ["next.config.ts", "package.json", "bun.lock"]) hash.update(readFileSync(file, "utf8").replaceAll("\r\n", "\n"));
  return hash.digest("hex").slice(0, 16);
}
