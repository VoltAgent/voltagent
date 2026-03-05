import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.spec.ts"],
    environment: "node",
    globals: true,
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
