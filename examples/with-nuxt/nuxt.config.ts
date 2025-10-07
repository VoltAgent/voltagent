// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ["@nuxt/eslint", "@nuxt/ui"],

  devtools: {
    enabled: true,
  },

  css: ["~/assets/css/main.css"],

  routeRules: {
    "/": { prerender: true },
  },

  compatibilityDate: "2025-01-15",

  eslint: {
    config: {
      stylistic: {
        commaDangle: "never",
        braceStyle: "1tbs",
        indent: 4,
      },
    },
  },

  // Add alias mappings for VoltAgent packages
  alias: {
    "@voltagent/core": "../../packages/core/dist/index.mjs",
    "@voltagent/libsql": "../../packages/libsql/dist/index.mjs",
    "@voltagent/server-hono": "../../packages/server-hono/dist/index.mjs",
    "@voltagent/logger": "../../packages/logger/dist/index.mjs",
    "@voltagent/internal": "../../packages/internal/dist/index.mjs",
    "@voltagent/server-core": "../../packages/server-core/dist/index.mjs",
  },

  // Configure Vite to resolve these packages
  vite: {
    resolve: {
      alias: {
        "@voltagent/core": "../../packages/core/dist/index.mjs",
        "@voltagent/libsql": "../../packages/libsql/dist/index.mjs",
        "@voltagent/server-hono": "../../packages/server-hono/dist/index.mjs",
        "@voltagent/logger": "../../packages/logger/dist/index.mjs",
        "@voltagent/internal": "../../packages/internal/dist/index.mjs",
        "@voltagent/server-core": "../../packages/server-core/dist/index.mjs",
      },
    },
  },
});
