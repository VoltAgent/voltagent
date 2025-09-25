import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
  target: "es2022",
  platform: "neutral",
  minify: false,
  external: ["@voltagent/core", "@voltagent/server-core", "@voltagent/internal", "hono"],
});
