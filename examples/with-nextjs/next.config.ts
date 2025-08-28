import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@voltagent/*",
    "@libsql/client",
    "@libsql/darwin-arm64",
    "@libsql/linux-x64-gnu",
    "@libsql/win32-x64-msvc",
    "@libsql/linux-arm64-gnu",
    "@libsql/darwin-x64",
  ],
};

export default nextConfig;
