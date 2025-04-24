import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@voltagent/*", "npm-check-updates"],
};

export default nextConfig;
