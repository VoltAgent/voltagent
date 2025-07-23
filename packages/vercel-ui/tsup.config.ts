import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: "esm",
  splitting: false,
  sourcemap: true,
  clean: false,
  target: "es2015",
  outDir: "dist",
  minify: false,
  dts: true,
  external: ["ai", "ai-v5", "@ai-sdk/ui-utils", "@ai-sdk/provider"],
  esbuildOptions(options) {
    options.keepNames = true;
    return options;
  },
});
