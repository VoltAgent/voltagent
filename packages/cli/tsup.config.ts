import { defineConfig } from "tsup";
import { markAsExternalPlugin } from "../shared/tsup-plugins/mark-as-external";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs"],
  splitting: false,
  sourcemap: true,
  clean: false,
  target: "es2022",
  outDir: "dist",
  minify: false,
  dts: true,
  loader: {
    ".toml": "text",
    ".template": "text",
  },
  esbuildPlugins: [markAsExternalPlugin],
  external: ["@voltagent/internal", "@voltagent/sdk"],
  esbuildOptions(options) {
    options.keepNames = true;
    return options;
  },
});
