import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track calls to createOpenAICompatible across module resets
let createOpenAICompatibleCalls: unknown[][] = [];

// Mock @voltagent/internal to avoid build dependency
vi.mock("@voltagent/internal", () => ({
  safeStringify: (value: unknown) => JSON.stringify(value),
}));

// Mock @ai-sdk/openai-compatible with a tracking wrapper
vi.mock("@ai-sdk/openai-compatible", () => ({
  createOpenAICompatible: (...args: unknown[]) => {
    createOpenAICompatibleCalls.push(args);
    const mockModel = {
      modelId: "mock-model",
      specificationVersion: "v1",
      provider: "edenai",
    };
    return {
      languageModel: () => mockModel,
      chatModel: () => mockModel,
    };
  },
}));

describe("Eden AI provider registry", () => {
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

  it("should list edenai as a registered provider", async () => {
    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const providers = registry.listProviders();
    expect(providers).toContain("edenai");
  });

  it("should load edenai provider via @ai-sdk/openai-compatible", async () => {
    process.env.EDENAI_API_KEY = "test-key-edenai";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const model = await registry.resolveLanguageModel("edenai/openai/gpt-4o-mini");

    expect(model).toBeDefined();
    expect(createOpenAICompatibleCalls.length).toBeGreaterThan(0);

    const lastCall = createOpenAICompatibleCalls[createOpenAICompatibleCalls.length - 1];
    const config = lastCall[0] as Record<string, unknown>;
    expect(config.name).toBe("edenai");
    expect(config.baseURL).toBe("https://api.edenai.run/v3");
    expect(config.apiKey).toBe("test-key-edenai");
  });

  it("should keep the vendor-prefixed model id after the provider segment", async () => {
    process.env.EDENAI_API_KEY = "test-key";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();

    // Eden AI ids are "<vendor>/<model>", so the full router id has two slashes;
    // only the first segment ("edenai") is the provider.
    const modelIds = [
      "openai/gpt-4o-mini",
      "anthropic/claude-haiku-4-5",
      "mistral/mistral-small-latest",
    ];

    for (const modelId of modelIds) {
      const model = await registry.resolveLanguageModel(`edenai/${modelId}`);
      expect(model).toBeDefined();
    }
  });

  it("should support EDENAI_BASE_URL override", async () => {
    process.env.EDENAI_API_KEY = "test-key";
    process.env.EDENAI_BASE_URL = "https://api.eu.edenai.run/v3";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    await registry.resolveLanguageModel("edenai/openai/gpt-4o-mini");

    const edenaiCall = createOpenAICompatibleCalls.find((call) => {
      const config = call[0] as Record<string, unknown>;
      return config.name === "edenai";
    });
    expect(edenaiCall).toBeDefined();
    if (!edenaiCall) {
      throw new Error("Expected edenai provider call to be recorded");
    }
    const config = edenaiCall[0] as Record<string, unknown>;
    expect(config.baseURL).toBe("https://api.eu.edenai.run/v3");
  });

  it("should throw if EDENAI_API_KEY is not set", async () => {
    process.env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== "EDENAI_API_KEY"),
    );

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();

    await expect(registry.resolveLanguageModel("edenai/openai/gpt-4o-mini")).rejects.toThrow(
      /EDENAI_API_KEY/,
    );
  });
});
