import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["fixtures/playground/*.spec.ts"],
    testTimeout: 30000,
    hookTimeout: 15000,
    sequence: { concurrent: false },
  },
});
