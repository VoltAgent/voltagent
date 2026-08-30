import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let createOpenAICompatibleCalls: unknown[][] = [];

vi.mock("@voltagent/internal", async () => {
  const actual = await vi.importActual<typeof import("@voltagent/internal")>("@voltagent/internal");
  return actual;
});

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: (...args: unknown[]) => {
    createOpenAICompatibleCalls.push(args);
    const mockModel = {
      modelId: "mock-model",
      specificationVersion: "v1",
      provider: "atlascloud",
    };
    return {
      languageModel: (modelId: string) => ({ ...mockModel, modelId }),
      chatModel: (modelId: string) => ({ ...mockModel, modelId }),
    };
  },
}));

describe("Atlas Cloud provider registry", () => {
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

  it("lists Atlas Cloud as a registered provider", async () => {
    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();

    expect(registry.listProviders()).toContain("atlascloud");
  });

  it("loads Atlas Cloud through the OpenAI-compatible adapter", async () => {
    process.env.ATLASCLOUD_API_KEY = "test-atlas-key";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const model = await registry.resolveLanguageModel("atlascloud/qwen/qwen3.5-flash");

    expect(model).toMatchObject({
      modelId: "qwen/qwen3.5-flash",
      provider: "atlascloud",
    });

    expect(createOpenAICompatibleCalls).toHaveLength(1);
    const config = createOpenAICompatibleCalls[0]?.[0] as Record<string, unknown>;
    expect(config).toMatchObject({
      name: "atlascloud",
      baseURL: "https://api.atlascloud.ai/v1",
      apiKey: "test-atlas-key",
      supportsStructuredOutputs: true,
    });
  });

  it("supports the conventional ATLASCLOUD_BASE_URL override", async () => {
    process.env.ATLASCLOUD_API_KEY = "test-atlas-key";
    process.env.ATLASCLOUD_BASE_URL = "https://atlas-proxy.example/v1";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    await registry.resolveLanguageModel("atlascloud/deepseek-ai/deepseek-v4-pro");

    const config = createOpenAICompatibleCalls[0]?.[0] as Record<string, unknown>;
    expect(config.baseURL).toBe("https://atlas-proxy.example/v1");
  });

  it("throws a helpful error when ATLASCLOUD_API_KEY is not set", async () => {
    const { ATLASCLOUD_API_KEY: _atlascloudApiKey, ...envWithoutAtlasCloud } = process.env;
    process.env = envWithoutAtlasCloud;

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();

    await expect(registry.resolveLanguageModel("atlascloud/qwen/qwen3.5-flash")).rejects.toThrow(
      /ATLASCLOUD_API_KEY/,
    );
  });
});
