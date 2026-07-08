import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@bodybalance/database",
    "@bodybalance/domain",
    "@bodybalance/events",
    "@bodybalance/shared",
    "@bodybalance/ui",
  ],
};

export default nextConfig;
