import { defineConfig } from "tsup";
import { markAsExternalPlugin } from "../shared/tsup-plugins/mark-as-external";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  splitting: false,
  sourcemap: true,
  clean: false,
  target: "es2022",
  outDir: "dist",
  minify: false,
  dts: true,
  external: ["ai", "ai-v5", "@ai-sdk/ui-utils", "@ai-sdk/provider"],
  esbuildPlugins: [markAsExternalPlugin],

  esbuildOptions(options) {
    options.keepNames = true;
    return options;
  },
});
