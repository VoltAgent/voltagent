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
    },
    typecheck: {
      include: ["**/**/*.spec-d.ts"],
      exclude: ["**/**/*.spec.ts"],
    },
    globals: true,
    testTimeout: 10000, // 10 seconds timeout for each test
    hookTimeout: 10000, // 10 seconds timeout for hooks
  },
});
