import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let createOpenAICompatibleCalls: unknown[][] = [];

vi.mock("@voltagent/internal", async () => {
  const actual = await vi.importActual<typeof import("@voltagent/internal")>("@voltagent/internal");
  return {
    ...actual,
    safeStringify: actual.safeStringify,
  };
});

vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: (...args: unknown[]) => {
    createOpenAICompatibleCalls.push(args);
    const mockModel = {
      modelId: "mock-model",
      specificationVersion: "v1",
      provider: "nearai",
    };
    return {
      languageModel: () => mockModel,
      chatModel: () => mockModel,
      textEmbeddingModel: () => mockModel,
    };
  },
}));

describe("NEAR AI provider registry", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    createOpenAICompatibleCalls = [];
    (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
    process.env = { ...originalEnv, NODE_ENV: "production" };
  });

  afterEach(() => {
    process.env = originalEnv;
    (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
  });

  it("should list nearai as a registered provider", async () => {
    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();

    expect(registry.listProviders()).toContain("nearai");
  });

  it("should load nearai through the OpenAI-compatible adapter", async () => {
    process.env.NEARAI_API_KEY = "test-nearai-key";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const model = await registry.resolveLanguageModel("nearai/zai-org/GLM-5.1-FP8");

    expect(model).toBeDefined();
    expect(createOpenAICompatibleCalls.length).toBeGreaterThan(0);

    const lastCall = createOpenAICompatibleCalls[createOpenAICompatibleCalls.length - 1];
    const config = lastCall[0] as Record<string, unknown>;
    expect(config.name).toBe("nearai");
    expect(config.baseURL).toBe("https://cloud-api.near.ai/v1");
    expect(config.apiKey).toBe("test-nearai-key");
    expect(config.supportsStructuredOutputs).toBe(false);
    expect(config.transformRequestBody).toBeTypeOf("function");
  });

  it("should support NEARAI_BASE_URL override", async () => {
    process.env.NEARAI_API_KEY = "test-nearai-key";
    process.env.NEARAI_BASE_URL = "https://custom.near.ai/v1";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    await registry.resolveLanguageModel("nearai/zai-org/GLM-5.1-FP8");

    const lastCall = createOpenAICompatibleCalls[createOpenAICompatibleCalls.length - 1];
    const config = lastCall[0] as Record<string, unknown>;
    expect(config.baseURL).toBe("https://custom.near.ai/v1");
  });

  it("should sanitize unsupported NEAR AI request fields", async () => {
    process.env.NEARAI_API_KEY = "test-nearai-key";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    await registry.resolveLanguageModel("nearai/zai-org/GLM-5.1-FP8");

    const lastCall = createOpenAICompatibleCalls[createOpenAICompatibleCalls.length - 1];
    const config = lastCall[0] as Record<string, unknown>;
    const transformRequestBody = config.transformRequestBody as (
      args: Record<string, unknown>,
    ) => Record<string, unknown>;

    const transformed = transformRequestBody({
      messages: [{ role: "developer", content: "Use concise answers." }],
      reasoning_effort: "medium",
      store: true,
      response_format: {
        type: "json_schema",
        json_schema: { name: "result", strict: true },
      },
      tools: [
        {
          type: "function",
          function: { name: "lookup", strict: true },
        },
      ],
    });

    expect(transformed).not.toHaveProperty("reasoning_effort");
    expect(transformed).not.toHaveProperty("store");
    expect(transformed.messages).toEqual([{ role: "system", content: "Use concise answers." }]);
    expect(transformed.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "result" },
    });
    expect(transformed.tools).toEqual([
      {
        type: "function",
        function: { name: "lookup" },
      },
    ]);
  });

  it("should throw if NEARAI_API_KEY is not set", async () => {
    process.env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== "NEARAI_API_KEY"),
    );

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();

    await expect(registry.resolveLanguageModel("nearai/zai-org/GLM-5.1-FP8")).rejects.toThrow(
      /NEARAI_API_KEY/,
    );
  });
});
