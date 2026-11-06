import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let createOpenAICompatibleCalls: unknown[][] = [];

vi.mock("@voltagent/internal", () => ({
  safeStringify: (value: unknown) => JSON.stringify(value),
}));

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: (...args: unknown[]) => {
    createOpenAICompatibleCalls.push(args);
    const mockModel = { modelId: "mock-model", specificationVersion: "v1" };
    return {
      languageModel: () => mockModel,
      chatModel: () => mockModel,
    };
  },
}));

const REMOVED_FROM_MODELS_DEV = [
  "firmware",
  "github-models",
  "iflowcn",
  "kimi-for-coding",
  "llama",
  "v0",
];

describe("providers removed from models.dev", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    createOpenAICompatibleCalls = [];
    (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
  });

  it("are still registered", async () => {
    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const providers = ModelProviderRegistry.getInstance().listProviders();
    for (const id of REMOVED_FROM_MODELS_DEV) {
      expect(providers).toContain(id);
    }
  });

  it("still resolve a model ID", async () => {
    process.env.GITHUB_TOKEN = "test-token";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const model = await registry.resolveLanguageModel("github-models/openai/gpt-4o");

    expect(model).toBeDefined();
    expect(createOpenAICompatibleCalls[0]?.[0]).toMatchObject({
      baseURL: "https://models.github.ai/inference",
    });
  });
});

describe("providers models.dev moved to an unsupported package", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    createOpenAICompatibleCalls = [];
    (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
  });

  it.each([
    ["openrouter/openai/gpt-4o-mini", "OPENROUTER_API_KEY", "https://openrouter.ai/api/v1"],
    ["venice/venice-uncensored", "VENICE_API_KEY", "https://api.venice.ai/api/v1"],
  ])(
    "still resolve %s through the OpenAI-compatible adapter",
    async (modelId, envName, baseURL) => {
      process.env[envName] = "test-key";

      const { ModelProviderRegistry } = await import("./model-provider-registry");
      const model = await ModelProviderRegistry.getInstance().resolveLanguageModel(modelId);

      expect(model).toBeDefined();
      expect(createOpenAICompatibleCalls[0]?.[0]).toMatchObject({ baseURL });
    },
  );
});
