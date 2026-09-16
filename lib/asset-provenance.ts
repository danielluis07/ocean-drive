import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export async function assetSha256(path: string) {
  const bytes = await readFile(path);
  return createHash("sha256").update(/\.(tsx?|mjs|lock)$/.test(path) ? bytes.toString("utf8").replaceAll("\r\n", "\n") : bytes).digest("hex");
}
