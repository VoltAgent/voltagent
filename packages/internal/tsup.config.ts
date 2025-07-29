import { type Options as TsupConfigOptions, defineConfig } from "tsup";

const baseConfig = {
  format: ["cjs", "esm"],
  splitting: false,
  sourcemap: true,
  clean: false,
  target: "es2015",
  minify: false,
  dts: true,
  esbuildOptions(options) {
    options.keepNames = true;
    return options;
  },
} satisfies TsupConfigOptions;

export default defineConfig([
  {
    ...baseConfig,
    outDir: "dist/main",
    entry: ["src/index.ts"],
  },
  {
    ...baseConfig,
    outDir: "dist/test",
    entry: ["src/test/index.ts"],
  },
  {
    ...baseConfig,
    outDir: "dist/utils",
    entry: ["src/utils/index.ts"],
  },
  {
    ...baseConfig,
    outDir: "dist/types",
    dts: {
      only: true,
    },
    entry: ["src/types/index.ts"],
  },
]);
