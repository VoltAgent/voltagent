import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";
import { safeStringify } from "@voltagent/internal";
import { afterEach, describe, expect, it, vi } from "vitest";

const { writes } = vi.hoisted(() => ({ writes: new Map<string, string>() }));
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(),
  readFile: vi.fn().mockRejectedValue(new Error("No cached registry")),
  writeFile: vi.fn(async (filename: string, content: string) => {
    writes.set(filename, content);
  }),
}));

const fixture = {
  minimax: {
    id: "minimax",
    npm: "@ai-sdk/openai-compatible",
    api: "https://api.minimax.io/v1",
    models: { "MiniMax-M2.7": {}, "MiniMax-M3": {}, "speech-02-hd": {} },
  },
  "minimax-cn": {
    id: "minimax-cn",
    npm: "@ai-sdk/openai-compatible",
    api: "https://api.minimaxi.com/v1",
    models: { "MiniMax-M2.1": {}, "MiniMax-M3": {} },
  },
  openrouter: {
    id: "openrouter",
    npm: "@ai-sdk/openai-compatible",
    models: {
      "minimax/minimax-m3.1-flash:free": { modalities: { output: ["text"] } },
      "minimax/minimax-m3": {},
      "minimax/minimax-m2.7": {},
      "minimax/minimax-01": {},
      "minimax/minimax-m2-her": {},
      "minimax/minimax-m2-audio": { modalities: { output: ["audio"] } },
      "minimax/minimax-m2-embed": { family: "embedding" },
      "other-text": {},
    },
  },
  opencode: {
    id: "opencode",
    npm: "@ai-sdk/openai-compatible",
    models: {
      "minimax-m3.1-flash-free": {},
      "minimax-m3": {},
      "minimax-m3-free": { status: "deprecated" },
      "minimax-m2.1-free": {},
      "minimax-m2.5": {},
      "minimax-speech-02": { modalities: { output: ["audio"] } },
      "gpt-5-nano": {},
    },
  },
  gateway: {
    id: "gateway",
    npm: "@ai-sdk/openai-compatible",
    models: {
      "minimax/minimax-m2.7": {},
      "other-text": {},
      "other-embed": { family: "embedding" },
    },
  },
};

function modelsFor(content: string, provider: string): string[] {
  const match = content.match(
    new RegExp(`readonly ['"]?${provider}['"]?: readonly \\[([\\s\\S]*?)\\];`),
  );
  return [...(match?.[1] ?? "").matchAll(/['"]([^'"]+)['"]/g)].map((entry) => entry[1]);
}

function catalogFixture(hasCurrentRoutes: boolean) {
  const data = structuredClone(fixture);
  if (!hasCurrentRoutes) {
    for (const provider of [data.openrouter, data.opencode]) {
      provider.models = Object.fromEntries(
        Object.entries(provider.models).filter(([id]) => !id.includes("-m3")),
      ) as typeof provider.models;
    }
  }
  return data;
}

function checkCatalog(content: string, hasCurrentRoutes = true) {
  expect(modelsFor(content, "minimax")).toEqual([
    "MiniMax-M3.1-Flash",
    "MiniMax-M3",
    "speech-02-hd",
  ]);
  expect(modelsFor(content, "minimax-cn")).toEqual(["MiniMax-M3.1-Flash", "MiniMax-M3"]);
  expect(modelsFor(content, "openrouter")).toEqual([
    "minimax/minimax-m2-audio",
    "minimax/minimax-m2-embed",
    ...(hasCurrentRoutes ? ["minimax/minimax-m3", "minimax/minimax-m3.1-flash:free"] : []),
    "other-text",
  ]);
  expect(modelsFor(content, "opencode")).toEqual([
    "gpt-5-nano",
    ...(hasCurrentRoutes ? ["minimax-m3", "minimax-m3.1-flash-free"] : []),
    "minimax-speech-02",
  ]);
  expect(modelsFor(content, "gateway")).toEqual([
    "minimax/minimax-m2.7",
    "other-embed",
    "other-text",
  ]);
}

afterEach(() => {
  vi.unstubAllGlobals();
  writes.clear();
  (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
});

describe("MiniMax catalog suggestions", () => {
  it.each([true, false])(
    "generates suggestions only for returned gateway routes (available: %s)",
    async (hasCurrentRoutes) => {
      const script = fileURLToPath(
        new URL("../../scripts/generate-model-provider-registry.js", import.meta.url),
      );
      await runInNewContext(readFileSync(script, "utf8"), {
        __dirname: path.dirname(script),
        process,
        console,
        fetch: async () => ({ ok: true, json: async () => catalogFixture(hasCurrentRoutes) }),
        require: (name: string) => {
          if (name === "node:path") return path;
          if (name === "node:fs")
            return {
              mkdirSync: () => {},
              writeFileSync: (filename: string, content: string) => writes.set(filename, content),
            };
          return { safeStringify };
        },
      });
      checkCatalog(
        [...writes.entries()].find(([name]) =>
          name.endsWith("model-provider-types.generated.ts"),
        )?.[1] ?? "",
        hasCurrentRoutes,
      );
      const embedding =
        [...writes.entries()].find(([name]) =>
          name.endsWith("embedding-model-router-types.generated.ts"),
        )?.[1] ?? "";
      expect(modelsFor(embedding, "gateway")).toEqual(["other-embed"]);
      expect(modelsFor(embedding, "minimax")).toEqual([]);
      expect(modelsFor(embedding, "openrouter")).toEqual(["minimax/minimax-m2-embed"]);
    },
  );

  it.each([true, false])(
    "refreshes only returned gateway routes (available: %s)",
    async (hasCurrentRoutes) => {
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => ({ ok: true, json: async () => catalogFixture(hasCurrentRoutes) })),
      );
      const { ModelProviderRegistry } = await import("./model-provider-registry");
      await ModelProviderRegistry.getInstance().refreshRegistry(true);
      const types =
        [...writes.entries()].find(([name]) =>
          name.endsWith("model-provider-types.generated.d.ts"),
        )?.[1] ?? "";
      checkCatalog(types, hasCurrentRoutes);
      const snapshot = JSON.parse(
        [...writes.entries()].find(([name]) => name.endsWith(".json"))?.[1] ?? "{}",
      );
      for (const provider of ["openrouter", "opencode", "gateway"]) {
        expect(snapshot.models[provider]).toEqual(modelsFor(types, provider));
      }
    },
  );

  it("preserves explicit legacy and custom gateway IDs after refresh", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => fixture })),
    );
    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const { createOpenAICompatible } = await import("@ai-sdk/openai-compatible");
    const registry = ModelProviderRegistry.getInstance();
    await registry.refreshRegistry(true);
    for (const provider of ["openrouter", "opencode", "custom-gateway"]) {
      registry.registerProvider(
        provider,
        createOpenAICompatible({
          name: provider,
          baseURL: "https://example.invalid/v1",
          apiKey: "test-key",
        }),
      );
      for (const modelId of ["minimax/minimax-m2.7", "minimax-m2.1-free", "custom/model"]) {
        const model = await registry.resolveLanguageModel(`${provider}/${modelId}`);
        expect(model.modelId).toBe(modelId);
      }
    }
  });

  it("ships current native models and verified gateway routes", () => {
    const content = readFileSync(
      new URL("./model-provider-types.generated.ts", import.meta.url),
      "utf8",
    );
    for (const provider of ["minimax", "minimax-cn"]) {
      expect(modelsFor(content, provider)).toEqual(["MiniMax-M3.1-Flash", "MiniMax-M3"]);
    }
    expect(modelsFor(content, "openrouter").filter((id) => id.startsWith("minimax/"))).toEqual([
      "minimax/minimax-m3",
      "minimax/minimax-m3.1-flash:free",
    ]);
    expect(modelsFor(content, "opencode").filter((id) => id.startsWith("minimax-"))).toEqual([
      "minimax-m3",
      "minimax-m3.1-flash-free",
    ]);
  });
});
