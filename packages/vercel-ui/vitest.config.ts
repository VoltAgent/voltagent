import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    typecheck: {
      tsconfig: "./tsconfig.spec.json",
    },
    include: ["**/*.spec.ts"],
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/index.ts",
        "src/types.ts", // Exclude types file as it has 0% coverage
        "src/streams/type-utils.ts", // Exclude type-utils as it has 0% coverage
      ],
      thresholds: {
        branches: 100,
        functions: 100,
        lines: 100,
        statements: 100,
      },
    },
  },
});
