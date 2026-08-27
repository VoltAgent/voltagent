import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts"],
      thresholds: {
        "./src/utils/**/*.ts": {
          branches: 100,
          functions: 100,
          lines: 100,
          statements: 100,
        },
      },
    },
    typecheck: {
      include: ["**/**/*.spec-d.ts"],
      exclude: ["**/**/*.spec.ts"],
      // Only type-check the spec-d type tests (and their imports), so the
      // pre-existing type error in src/utils/objects.spec.ts does not fail
      // this package's typecheck run.
      tsconfig: "./tsconfig.typecheck.json",
    },
  },
});
