import sharp from "sharp";
import { assetSha256 } from "@/lib/asset-provenance";
import manifest from "@/content/asset-manifest.json";
import dependencies from "@/docs/third-party/dependencies.json";
import { inspectModel } from "@/lib/asset-audit";
import landmarks from "@/content/landmarks.json";
import { featureFile, featureModels, landmarkBudget, landmarkSources } from "@/content/landmark-sources";
import { decodePlacements, PLACEMENT_FIELDS } from "@/lib/landmark-features";
import { gzipSync } from "node:zlib";
import ship from "@/content/ship.json";
import { shipBudget, shipSource } from "@/content/ship-source";
import { ambientSoundBudget, productionBudgets } from "@/lib/production-budgets";
import { earthApproach } from "@/content/earth-approach";

export async function auditAssets() {
  const errors: string[] = [];
  const paths = new Set(manifest.assets.map((asset) => asset.path));
  const audio = manifest.assets.find(asset => asset.path === "public/audio/ocean-engine.v1.wav");
  if (!audio || audio.kind !== "audio" || audio.essential || !audio.experience) errors.push("Invalid ambient audio provenance");
  if (Bun.file("public/audio/ocean-engine.v1.wav").size > ambientSoundBudget) errors.push("Ambient audio exceeds transfer budget");
  let approachOptionalBytes = 0;
  for (const level of earthApproach.levels) {
    const path = `public${level.url}`;
    const record = manifest.assets.find(asset => asset.path === path);
    if (!record || record.sourceKind !== "open-data" || record.essential !== level.essential || !record.experience) errors.push(`Invalid NASA Approach record: ${path}`);
    if (!await Bun.file(path).exists()) { errors.push(`Missing Approach image: ${path}`); continue; }
    const metadata = await sharp(await Bun.file(path).arrayBuffer()).metadata();
    if (metadata.width !== level.size || metadata.height !== level.size) errors.push(`Approach native resolution mismatch: ${path}`);
    if (!level.essential) approachOptionalBytes += Bun.file(path).size;
    else if (Bun.file(path).size > earthApproach.essentialBytes) errors.push(`Essential Approach globe exceeds 450 KiB: ${path}`);
  }
  if (approachOptionalBytes > earthApproach.optionalBytes) errors.push(`Optional Approach images exceed 250 KiB: ${approachOptionalBytes}`);
  if (paths.has("public/images/earth-intro.v1.webp") || await Bun.file("public/images/earth-intro.v1.webp").exists()) errors.push("Retired AI Earth image remains");
  if (paths.size !== manifest.assets.length) errors.push("Duplicate asset records");
  for (const path of [shipSource.path, "content/ship.json", "content/ship-source.ts", "scripts/build-ship.ts", "docs/third-party/ship/source.html", "docs/third-party/ship/CC-BY-3.0.txt", ...Object.values(ship.variants).map((variant) => `public${variant.url}`)]) {
    if (!paths.has(path)) errors.push(`Unregistered Ship asset or source: ${path}`);
  }
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
    if (landmark.span !== source.span || landmark.shallowsWidth !== source.shallowsWidth) errors.push(`Landmark record is stale: ${source.id}`);
    if (!paths.has(`data/landmarks/${source.id}.json`)) errors.push(`Unregistered Landmark source data: ${source.id}`);
    for (const tier of ["balanced", "low"] as const) {
      if (!paths.has(`public${landmark.variants[tier].url}`)) errors.push(`Unregistered Landmark mesh: ${source.id} ${tier}`);
    }
  }
  if (landmarks.features.url !== featureFile.url || !paths.has(`public${featureFile.url}`)) errors.push("Unregistered Feature file");
  if (featureFile.source) {
    if (!paths.has(featureFile.source.path)) errors.push("Unregistered human Feature source");
    if (!await Bun.file(featureFile.source.proof).exists()) errors.push("Missing human Feature rights evidence");
  }
  for (const landmark of landmarks.landmarks) for (const tier of ["balanced", "low"] as const) {
    const textures = landmark.textures[tier];
    let bytes = 0;
    for (const texture of Object.values(textures)) {
      const path = `public${texture.url}`;
      const asset = manifest.assets.find((entry) => entry.path === path);
      if (!asset || asset.essential || !asset.experience) errors.push(`Invalid optional terrain texture record: ${path}`);
      if (!await Bun.file(path).exists()) { errors.push(`Missing terrain texture: ${path}`); continue; }
      const size = Bun.file(path).size;
      const metadata = await sharp(await Bun.file(path).arrayBuffer()).metadata();
      const expected = tier === "low" ? 512 : 1024;
      if (size !== texture.bytes || texture.size !== expected || metadata.width !== expected || metadata.height !== expected) errors.push(`Terrain texture record mismatch: ${path}`);
      bytes += size;
    }
    if (bytes > 150 * 1024) errors.push(`Terrain texture budget exceeded: ${landmark.id} ${tier}`);
    if (!("colour" in textures) || (tier === "balanced" && !("normal" in textures)) || (tier === "low" && "normal" in textures)) errors.push(`Invalid terrain texture set: ${landmark.id} ${tier}`);
  }
  let fonts = 0;
  let authoredVisuals = 0;
  for (const asset of manifest.assets) {
    if (!["project-source", "ofl-font", "ai-generated", "open-data", "licensed-model", "licensed-image"].includes(asset.sourceKind)) errors.push(`Unapproved source: ${asset.path}`);
    for (const field of ["creator", "source", "rights", "proof", "transformations", "retrieved"] as const) {
      if (!asset[field]) errors.push(`Missing ${field}: ${asset.path}`);
    }
    if (!(await Bun.file(asset.proof).exists())) errors.push(`Missing rights evidence: ${asset.path}`);
    if (!(await Bun.file(asset.path).exists())) { errors.push(`Missing asset: ${asset.path}`); continue; }
    if (await assetSha256(asset.path) !== asset.sha256) errors.push(`Unrecorded transformation: ${asset.path}`);
    if (asset.kind === "font") fonts += Bun.file(asset.path).size;
    if (asset.kind === "authored" && asset.experience && asset.path.startsWith("public/")) authoredVisuals += Bun.file(asset.path).size;
    if (asset.path.startsWith("public/") && asset.path.endsWith(".glb")) {
      const buffer = await Bun.file(asset.path).arrayBuffer();
      const model = inspectModel(buffer);
      const low = asset.path.includes("-low.");
      if (!model.opaque || model.animations || model.skins || model.externalResources.length) errors.push(`Invalid model materials/resources: ${asset.path}`);
      if (asset.path === `public${featureFile.url}`) {
        // The shared Feature file: its own transfer budget, and each Landmark's
        // allowance for what its placements expand to in that Landmark's draw.
        if (buffer.byteLength > featureFile.bytes) errors.push(`Feature file budget exceeded: ${buffer.byteLength} bytes`);
        if (model.materials !== 1 || model.textures > 1 || model.imageSizes.length > 1 || model.imageSizes.some(({ width, height }) => width !== featureFile.textureSize || height !== featureFile.textureSize)) errors.push(`Invalid Feature materials/resources: ${asset.path}`);
        if (buffer.byteLength !== landmarks.features.bytes) errors.push(`Feature record does not match its file: ${asset.path}`);
        const names = model.features?.models ?? [];
        const declared: Record<string, { triangles: number }> = landmarks.features.models;
        if (names.join() !== featureModels.join() || names.some((name) => model.partTriangles[name] !== declared[name]?.triangles))
          errors.push(`Feature models do not match their record: ${asset.path}`);
        const placed = model.features?.placements ?? {};
        for (const id of Object.keys(placed)) if (!landmarkSources.some((source) => source.id === id)) errors.push(`Features placed on an unknown Landmark: ${id}`);
        for (const landmark of landmarks.landmarks) {
          const record = placed[landmark.id] ?? [];
          const placements = decodePlacements(record);
          if (record.length % PLACEMENT_FIELDS || placements.some((placement) => !names[placement.model])) { errors.push(`Invalid Feature placements: ${landmark.id}`); continue; }
          const triangles = placements.reduce((total, placement) => total + model.partTriangles[names[placement.model]], 0);
          const budget = landmarkBudget.balanced;
          if (placements.length > budget.instances || triangles > budget.featureTriangles) errors.push(`Landmark Feature budget exceeded: ${landmark.id} (${placements.length} instances, ${triangles} triangles)`);
          if (landmark.features.instances !== placements.length || landmark.features.triangles !== triangles) errors.push(`Landmark record does not match its Features: ${landmark.id}`);
        }
        continue;
      }
      const island = /\/landmark-(.+)-(balanced|low)\.v\d+\.glb$/.exec(asset.path);
      if (!island) {
        const tier = low ? "low" : "balanced";
        const budget = shipBudget[tier];
        const declared = ship.variants[tier];
        const transfer = gzipSync(buffer).length;
        if (model.triangles > budget.triangles || buffer.byteLength > budget.bytes || transfer > budget.transfer || model.materials > budget.materials || model.draws > budget.draws || model.textures > budget.textures || model.imageSizes.some(({ width, height }) => width > budget.textureSize || height > budget.textureSize)) errors.push(`Ship budget exceeded: ${asset.path}`);
        if (`public${declared.url}` !== asset.path || declared.triangles !== model.triangles || declared.bytes !== buffer.byteLength || declared.transfer !== transfer || declared.materials !== model.materials || declared.textures !== model.textures || declared.draws !== model.draws || model.imageSizes.some(({ width, height }) => width !== declared.textureSize || height !== declared.textureSize)) errors.push(`Ship record does not match its mesh: ${asset.path}`);
        if (!model.parts.includes("Del Mar") || model.placement?.forwardAxis !== "-Z" || model.placement.origin !== "waterline") errors.push(`Invalid Ship placement: ${asset.path}`);
        continue;
      }
      if (model.materials > 2 || model.textures) errors.push(`Invalid Landmark materials/resources: ${asset.path}`);
      // Per-Landmark budgets, checked against the shipped mesh and reconciled
      // with the record the scene reads its triangle and byte counts from.
      const tier = island[2] as keyof typeof landmarkBudget;
      const budget = landmarkBudget[tier];
      // Low draws its own two meshes only. Balanced and High add one draw when
      // anything stands on the island, whatever the number of instances.
      const standing = landmarks.landmarks.find((entry) => entry.id === island[1])?.features.instances;
      const draws = model.draws + (tier === "balanced" && standing ? 1 : 0);
      if (model.triangles > budget.triangles || buffer.byteLength > budget.bytes || draws > budget.draws) errors.push(`Landmark budget exceeded: ${asset.path} (${model.triangles} triangles, ${buffer.byteLength} bytes, ${draws} draws)`);
      if (!model.parts.includes("island") || !model.parts.includes("surf")) errors.push(`Landmark is missing its island or surf mesh: ${asset.path}`);
      const declared = landmarks.landmarks.find((entry) => entry.id === island[1])?.variants[tier];
      if (!declared || declared.triangles !== model.triangles || declared.bytes !== buffer.byteLength) errors.push(`Landmark record does not match its mesh: ${asset.path}`);
    }
  }
  if (fonts > 160 * 1024) errors.push("Font budget exceeded");
  if (authoredVisuals > productionBudgets.allVisuals) errors.push("All authored visuals exceed 1.8 MiB");
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
