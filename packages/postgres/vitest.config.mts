import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/__tests__/**/*.test.ts", "**/*.spec.ts"],
    exclude: ["**/node_modules/**", "**/*.integration.test.ts"], // Exclude node_modules and integration tests
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.d.ts", "src/**/index.ts"],
    },
    globals: true,
  },
});
