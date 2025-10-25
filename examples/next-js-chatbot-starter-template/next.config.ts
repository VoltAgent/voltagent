import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    // Externalize LibSQL client and OpenTelemetry instrumentation packages
    "@libsql/client",
    "libsql",
  ],
};

export default nextConfig;
