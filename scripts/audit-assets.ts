import { assetSha256 } from "@/lib/asset-provenance";
import manifest from "@/content/asset-manifest.json";
import dependencies from "@/docs/third-party/dependencies.json";
import { inspectModel } from "@/lib/asset-audit";
import landmarks from "@/content/landmarks.json";
import { landmarkBudget, landmarkSources } from "@/content/landmark-sources";
import { gzipSync } from "node:zlib";

export async function auditAssets() {
  const errors: string[] = [];
  const paths = new Set(manifest.assets.map((asset) => asset.path));
  if (paths.size !== manifest.assets.length) errors.push("Duplicate asset records");
  for (const directory of ["public", "fonts", "data"]) {
    for await (const file of new Bun.Glob("**/*").scan({ cwd: directory, onlyFiles: true })) {
      const path = `${directory}/${file.replaceAll("\\", "/")}`;
      if (directory === "fonts" && !path.endsWith(".woff2")) continue;
      if (!paths.has(path)) errors.push(`Unregistered asset: ${path}`);
    }
  }
  // Every island Stop's Landmark ships at both tiers, built from a record.
  for (const source of landmarkSources) {
    const landmark = landmarks.landmarks.find((entry) => entry.id === source.id);
    if (!landmark) { errors.push(`Unbuilt Landmark: ${source.id}`); continue; }
    if (landmark.span !== source.span) errors.push(`Landmark record is stale: ${source.id}`);
    if (!paths.has(`data/landmarks/${source.id}.json`)) errors.push(`Unregistered Landmark source data: ${source.id}`);
    for (const tier of ["balanced", "low"] as const) {
      if (!paths.has(`public${landmark.variants[tier].url}`)) errors.push(`Unregistered Landmark mesh: ${source.id} ${tier}`);
    }
  }
  let fonts = 0;
  for (const asset of manifest.assets) {
    if (!["project-source", "ofl-font", "ai-generated", "open-data"].includes(asset.sourceKind)) errors.push(`Unapproved source: ${asset.path}`);
    for (const field of ["creator", "source", "rights", "proof", "transformations", "retrieved"] as const) {
      if (!asset[field]) errors.push(`Missing ${field}: ${asset.path}`);
    }
    if (!(await Bun.file(asset.proof).exists())) errors.push(`Missing rights evidence: ${asset.path}`);
    if (!(await Bun.file(asset.path).exists())) { errors.push(`Missing asset: ${asset.path}`); continue; }
    if (await assetSha256(asset.path) !== asset.sha256) errors.push(`Unrecorded transformation: ${asset.path}`);
    if (asset.kind === "font") fonts += Bun.file(asset.path).size;
    if (asset.path.endsWith(".glb")) {
      const buffer = await Bun.file(asset.path).arrayBuffer();
      const model = inspectModel(buffer);
      const low = asset.path.includes("-low.");
      if (model.materials > 2 || !model.opaque || model.textures || model.animations || model.skins || model.externalResources.length) errors.push(`Invalid model materials/resources: ${asset.path}`);
      const island = /\/landmark-(.+)-(balanced|low)\.v\d+\.glb$/.exec(asset.path);
      if (!island) {
        if (model.triangles > (low ? 4000 : 12000) || gzipSync(buffer).length > (low ? 120 : 250) * 1024) errors.push(`Vessel budget exceeded: ${asset.path}`);
        continue;
      }
      // Per-Landmark budgets, checked against the shipped mesh and reconciled
      // with the record the scene reads its triangle and byte counts from.
      const tier = island[2] as keyof typeof landmarkBudget;
      const budget = landmarkBudget[tier];
      if (model.triangles > budget.triangles || buffer.byteLength > budget.bytes) errors.push(`Landmark budget exceeded: ${asset.path} (${model.triangles} triangles, ${buffer.byteLength} bytes)`);
      if (!model.parts.includes("island") || !model.parts.includes("surf")) errors.push(`Landmark is missing its island or surf mesh: ${asset.path}`);
      const declared = landmarks.landmarks.find((entry) => entry.id === island[1])?.variants[tier];
      if (!declared || declared.triangles !== model.triangles || declared.bytes !== buffer.byteLength) errors.push(`Landmark record does not match its mesh: ${asset.path}`);
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
