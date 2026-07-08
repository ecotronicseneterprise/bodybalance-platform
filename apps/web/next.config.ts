import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Workspace packages are consumed as TypeScript source (no per-package build
  // step); Next transpiles them. See BLUEPRINT 4.1 folder structure.
  transpilePackages: [
    "@bodybalance/ai",
    "@bodybalance/database",
    "@bodybalance/domain",
    "@bodybalance/events",
    "@bodybalance/shared",
    "@bodybalance/ui",
  ],
};

export default nextConfig;
