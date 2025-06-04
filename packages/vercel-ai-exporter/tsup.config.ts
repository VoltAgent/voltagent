import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: false,
  outDir: "dist",
  external: [
    "@opentelemetry/core",
    "@opentelemetry/sdk-trace-base",
    "@voltagent/sdk",
    "@voltagent/core",
    "ai",
  ],
});
