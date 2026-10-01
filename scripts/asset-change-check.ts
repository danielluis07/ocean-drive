import { appendFileSync } from "node:fs";

// Conservative: dependency/runtime changes can alter binary encoder output too.
export function affectsGeneratedAssets(path: string) {
  return /^(data\/(ship|landmarks)\/|public\/models\/|content\/(ship|landmark)[^/]*\.(ts|json)$|scripts\/(build-ship|generate-landmarks|landmark-feature-models|asset-bake|ship-texture-bake|asset-change-check)\.ts$|lib\/landmark-(geometry|surface|features)\.ts$|package\.json$|bun\.lock$|tsconfig\.json$|\.github\/workflows\/)/.test(path);
}

if (import.meta.main) {
  const base = process.env.BASE_SHA;
  const head = process.env.HEAD_SHA;
  const output = process.env.GITHUB_OUTPUT;
  if (!head || !output) throw new Error("HEAD_SHA and GITHUB_OUTPUT are required");
  let changed = true;
  // A new branch/root push has no comparison base: regenerate rather than skip.
  if (base && !/^0+$/.test(base)) {
    const diff = Bun.spawnSync(["git", "diff", "--name-only", "--no-renames", "-z", base, head], { stdout: "pipe", stderr: "pipe" });
    if (diff.exitCode !== 0) throw new Error(diff.stderr.toString());
    changed = diff.stdout.toString().split("\0").some(affectsGeneratedAssets);
  }
  appendFileSync(output, `changed=${changed}\n`);
  console.log(`Asset regeneration ${changed ? "required" : "not needed"}.`);
}
