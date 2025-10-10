import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@libsql/client"],
  transpilePackages: ["@voltagent/core"],
};

export default nextConfig;
