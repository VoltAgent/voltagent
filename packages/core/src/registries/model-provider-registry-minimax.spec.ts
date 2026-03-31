import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Track calls to createOpenAICompatible across module resets
let createOpenAICompatibleCalls: unknown[][] = [];
let createAnthropicCalls: unknown[][] = [];

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
      provider: "minimax",
    };
    return {
      languageModel: () => mockModel,
      chatModel: () => mockModel,
    };
  },
}));

// Mock @ai-sdk/anthropic to track if it's called for MiniMax
vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: (...args: unknown[]) => {
    createAnthropicCalls.push(args);
    return {
      languageModel: () => ({ modelId: "anthropic-model" }),
      chatModel: () => ({ modelId: "anthropic-model" }),
    };
  },
  anthropic: {
    languageModel: () => ({ modelId: "anthropic-model" }),
    chatModel: () => ({ modelId: "anthropic-model" }),
  },
}));

describe("MiniMax provider registry", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    createOpenAICompatibleCalls = [];
    createAnthropicCalls = [];
    (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    (globalThis as Record<string, unknown>).___voltagent_model_provider_registry = undefined;
  });

  it("should list minimax as a registered provider", async () => {
    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const providers = registry.listProviders();
    expect(providers).toContain("minimax");
  });

  it("should list minimax-cn as a registered provider", async () => {
    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const providers = registry.listProviders();
    expect(providers).toContain("minimax-cn");
  });

  it("should load minimax provider via @ai-sdk/openai-compatible", async () => {
    process.env.MINIMAX_API_KEY = "test-key-minimax";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const model = await registry.resolveLanguageModel("minimax/MiniMax-M2.7");

    expect(model).toBeDefined();
    expect(createOpenAICompatibleCalls.length).toBeGreaterThan(0);

    const lastCall = createOpenAICompatibleCalls[createOpenAICompatibleCalls.length - 1];
    const config = lastCall[0] as Record<string, unknown>;
    expect(config.name).toBe("minimax");
    expect(config.baseURL).toBe("https://api.minimax.io/v1");
    expect(config.apiKey).toBe("test-key-minimax");
  });

  it("should load minimax-cn provider with China base URL", async () => {
    process.env.MINIMAX_API_KEY = "test-key-minimax-cn";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    const model = await registry.resolveLanguageModel("minimax-cn/MiniMax-M2.7");

    expect(model).toBeDefined();

    // Find the call for minimax-cn
    const cnCall = createOpenAICompatibleCalls.find((call) => {
      const config = call[0] as Record<string, unknown>;
      return config.name === "minimax-cn";
    });
    expect(cnCall).toBeDefined();
    if (!cnCall) {
      throw new Error("Expected minimax-cn provider call to be recorded");
    }
    const config = cnCall[0] as Record<string, unknown>;
    expect(config.baseURL).toBe("https://api.minimaxi.com/v1");
    expect(config.apiKey).toBe("test-key-minimax-cn");
  });

  it("should support MINIMAX_BASE_URL override", async () => {
    process.env.MINIMAX_API_KEY = "test-key";
    process.env.MINIMAX_BASE_URL = "https://custom.minimax.io/v1";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    await registry.resolveLanguageModel("minimax/MiniMax-M2.7");

    const minimaxCall = createOpenAICompatibleCalls.find((call) => {
      const config = call[0] as Record<string, unknown>;
      return config.name === "minimax";
    });
    expect(minimaxCall).toBeDefined();
    if (!minimaxCall) {
      throw new Error("Expected minimax provider call to be recorded");
    }
    const config = minimaxCall[0] as Record<string, unknown>;
    expect(config.baseURL).toBe("https://custom.minimax.io/v1");
  });

  it("should throw if MINIMAX_API_KEY is not set", async () => {
    process.env = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key !== "MINIMAX_API_KEY"),
    );

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();

    await expect(registry.resolveLanguageModel("minimax/MiniMax-M2.7")).rejects.toThrow(
      /MINIMAX_API_KEY/,
    );
  });

  it("should resolve multiple MiniMax model variants", async () => {
    process.env.MINIMAX_API_KEY = "test-key";

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();

    const modelIds = [
      "MiniMax-M2.7",
      "MiniMax-M2.7-highspeed",
      "MiniMax-M2.5",
      "MiniMax-M2.5-highspeed",
    ];

    for (const modelId of modelIds) {
      const model = await registry.resolveLanguageModel(`minimax/${modelId}`);
      expect(model).toBeDefined();
    }
  });

  it("should not use @ai-sdk/anthropic adapter for minimax", async () => {
    process.env.MINIMAX_API_KEY = "test-key";

    const anthropicCallsBefore = createAnthropicCalls.length;

    const { ModelProviderRegistry } = await import("./model-provider-registry");
    const registry = ModelProviderRegistry.getInstance();
    await registry.resolveLanguageModel("minimax/MiniMax-M2.7");

    // Anthropic adapter should NOT have been called for MiniMax
    expect(createAnthropicCalls.length).toBe(anthropicCallsBefore);
    // OpenAI-compatible adapter SHOULD have been called
    expect(createOpenAICompatibleCalls.length).toBeGreaterThan(0);
  });
});
