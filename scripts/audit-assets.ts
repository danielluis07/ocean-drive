import { assetSha256 } from "@/lib/asset-provenance";
import manifest from "@/content/asset-manifest.json";
import dependencies from "@/docs/third-party/dependencies.json";
import { inspectVessel } from "@/lib/asset-audit";
import { gzipSync } from "node:zlib";

export async function auditAssets() {
  const errors: string[] = [];
  const paths = new Set(manifest.assets.map((asset) => asset.path));
  if (paths.size !== manifest.assets.length) errors.push("Duplicate asset records");
  for (const directory of ["public", "fonts"]) {
    for await (const file of new Bun.Glob("**/*").scan({ cwd: directory, onlyFiles: true })) {
      const path = `${directory}/${file.replaceAll("\\", "/")}`;
      if (directory === "fonts" && !path.endsWith(".woff2")) continue;
      if (!paths.has(path)) errors.push(`Unregistered asset: ${path}`);
    }
  }
  let fonts = 0;
  for (const asset of manifest.assets) {
    if (!["project-source", "ofl-font", "ai-generated"].includes(asset.sourceKind)) errors.push(`Unapproved source: ${asset.path}`);
    for (const field of ["creator", "source", "rights", "proof", "transformations", "retrieved"] as const) {
      if (!asset[field]) errors.push(`Missing ${field}: ${asset.path}`);
    }
    if (!(await Bun.file(asset.proof).exists())) errors.push(`Missing rights evidence: ${asset.path}`);
    if (!(await Bun.file(asset.path).exists())) { errors.push(`Missing asset: ${asset.path}`); continue; }
    if (await assetSha256(asset.path) !== asset.sha256) errors.push(`Unrecorded transformation: ${asset.path}`);
    if (asset.kind === "font") fonts += Bun.file(asset.path).size;
    if (asset.path.endsWith(".glb")) {
      const buffer = await Bun.file(asset.path).arrayBuffer();
      const vessel = inspectVessel(buffer);
      const low = asset.path.includes("-low.");
      if (vessel.materials > 2 || !vessel.opaque || vessel.textures || vessel.animations || vessel.skins || vessel.externalResources.length) errors.push(`Invalid vessel materials/resources: ${asset.path}`);
      if (vessel.triangles > (low ? 4000 : 12000) || gzipSync(buffer).length > (low ? 120 : 250) * 1024) errors.push(`Vessel budget exceeded: ${asset.path}`);
    }
  }
  if (fonts > 160 * 1024) errors.push("Font budget exceeded");
  if (await assetSha256("bun.lock") !== dependencies.lockSha256) errors.push("Dependency notices require reconciliation with bun.lock");
  for (const dependency of dependencies.dependencies) {
    if (!dependency.license || /UNKNOWN|UNLICENSED/i.test(dependency.license) || !await Bun.file(dependency.proof).exists()) errors.push(`Missing dependency rights: ${dependency.name}`);
  }
  return errors;
}

if (import.meta.main) {
  const errors = await auditAssets();
  if (errors.length) { console.error(errors.join("\n")); process.exitCode = 1; }
  else console.log(`Asset provenance verified: ${manifest.assets.length} records; dependency lock and retained notices match.`);
}
