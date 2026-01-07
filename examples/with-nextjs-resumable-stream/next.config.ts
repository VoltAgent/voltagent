import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    // Externalize only what’s needed at runtime.
    // LibSQL client is safe to externalize; native platform packages are optional.
    "@libsql/client",
  ],
};

export default nextConfig;
