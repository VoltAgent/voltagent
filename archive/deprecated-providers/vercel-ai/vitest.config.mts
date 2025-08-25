import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["**/__tests__/**/*.test.ts", "**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts"],
      include: ["src/**/*.ts"],
    },
  },
});
