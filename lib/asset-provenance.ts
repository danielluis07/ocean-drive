import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

// Text sources are hashed with LF line endings, so a checkout that converts them
// to CRLF (core.autocrlf on Windows) records the same provenance as CI.
export async function assetSha256(path: string) {
  const bytes = await readFile(path);
  return createHash("sha256").update(/\.(tsx?|mjs|lock|json|html|txt|md)$/.test(path) ? bytes.toString("utf8").replaceAll("\r\n", "\n") : bytes).digest("hex");
}
