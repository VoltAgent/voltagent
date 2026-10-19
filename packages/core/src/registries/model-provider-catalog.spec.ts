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

function checkCatalog(content: string) {
  expect(modelsFor(content, "minimax")).toEqual([
    "MiniMax-M3.1-Flash",
    "MiniMax-M3",
    "speech-02-hd",
  ]);
  expect(modelsFor(content, "minimax-cn")).toEqual(["MiniMax-M3.1-Flash", "MiniMax-M3"]);
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
  it("generates current native suggestions without changing gateway or nontext entries", async () => {
    const script = fileURLToPath(
      new URL("../../scripts/generate-model-provider-registry.js", import.meta.url),
    );
    await runInNewContext(readFileSync(script, "utf8"), {
      __dirname: path.dirname(script),
      process,
      console,
      fetch: async () => ({ ok: true, json: async () => fixture }),
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
    );
    const embedding =
      [...writes.entries()].find(([name]) =>
        name.endsWith("embedding-model-router-types.generated.ts"),
      )?.[1] ?? "";
    expect(modelsFor(embedding, "gateway")).toEqual(["other-embed"]);
    expect(modelsFor(embedding, "minimax")).toEqual([]);
  });

  it("keeps runtime refresh suggestions aligned without rewriting gateway model IDs", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => fixture })),
    );
    const { ModelProviderRegistry } = await import("./model-provider-registry");
    await ModelProviderRegistry.getInstance().refreshRegistry(true);
    const types =
      [...writes.entries()].find(([name]) =>
        name.endsWith("model-provider-types.generated.d.ts"),
      )?.[1] ?? "";
    checkCatalog(types);
  });

  it("ships the generated current model pair for both native regions", () => {
    const content = readFileSync(
      new URL("./model-provider-types.generated.ts", import.meta.url),
      "utf8",
    );
    for (const provider of ["minimax", "minimax-cn"]) {
      expect(modelsFor(content, provider)).toEqual(["MiniMax-M3.1-Flash", "MiniMax-M3"]);
    }
  });
});
