import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@voltagent/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@voltagent/internal": path.resolve(__dirname, "../../packages/internal/src/index.ts"),
    },
  },
  test: {
    include: ["**/*.spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts"],
    },
    typecheck: {
      include: ["**/**/*.spec-d.ts"],
      exclude: ["**/**/*.spec.ts"],
    },
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
