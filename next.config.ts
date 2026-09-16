import type { NextConfig } from "next";
import { execFileSync } from "node:child_process";
import { sourceFingerprint } from "@/scripts/build-identity";

const candidate = process.env.RELEASE_CANDIDATE ?? execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const build = process.env.BUILD_ID ?? `${candidate}-${sourceFingerprint()}`;

const nextConfig: NextConfig = {
  generateBuildId: async () => build,
  env: { NEXT_PUBLIC_RELEASE_CANDIDATE: candidate, NEXT_PUBLIC_BUILD_ID: build },
};

export default nextConfig;
