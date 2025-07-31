import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@voltagent/*", "@libsql/client"],
};

export default nextConfig;
