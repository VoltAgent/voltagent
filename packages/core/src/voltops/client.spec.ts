import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { expectTypeOf } from "vitest";
import { VoltOpsClient, createVoltOpsClient } from "./client";
import type { VoltOpsClientOptions, VoltOpsClient as IVoltOpsClient } from "./types";

// Simple mock for VoltOpsPromptManagerImpl
const mockPromptManager = {
  getPrompt: vi.fn(),
  preload: vi.fn(),
  clearCache: vi.fn(),
  getCacheStats: vi.fn(),
};

// Mock the prompt manager module
vi.mock("./prompt-manager", () => ({
  VoltOpsPromptManagerImpl: vi.fn(() => mockPromptManager),
}));

describe("VoltOpsClient", () => {
  let client: VoltOpsClient;
  const mockOptions: VoltOpsClientOptions = {
    baseUrl: "https://api.voltops.com",
    publicKey: "pub_test_key",
    secretKey: "sec_test_key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new VoltOpsClient(mockOptions);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create client instance with correct options", () => {
      expect(client).toBeInstanceOf(VoltOpsClient);
      expect(client.options.baseUrl).toBe(mockOptions.baseUrl);
      expect(client.options.publicKey).toBe(mockOptions.publicKey);
      expect(client.options.secretKey).toBe(mockOptions.secretKey);
    });

    it("should initialize prompts manager", () => {
      expect(client.prompts).toBeDefined();
      expect(client.prompts).toBe(mockPromptManager);
    });

    it("should set default cache configuration", () => {
      expect(client.options.promptCache).toEqual({
        enabled: true,
        ttl: 300, // 5 minutes
        maxSize: 100,
      });
    });

    it("should use custom cache configuration when provided", () => {
      const customOptions: VoltOpsClientOptions = {
        ...mockOptions,
        promptCache: {
          enabled: false,
          ttl: 600, // 10 minutes
          maxSize: 50,
        },
      };

      const customClient = new VoltOpsClient(customOptions);

      expect(customClient.options.promptCache).toEqual({
        enabled: false,
        ttl: 600,
        maxSize: 50,
      });
    });

    it("should merge partial cache configuration with defaults", () => {
      const partialOptions: VoltOpsClientOptions = {
        ...mockOptions,
        promptCache: {
          ttl: 1800, // 30 minutes - only override TTL
        },
      };

      const partialClient = new VoltOpsClient(partialOptions);

      expect(partialClient.options.promptCache).toEqual({
        enabled: true, // default
        ttl: 1800, // custom
        maxSize: 100, // default
      });
    });
  });

  describe("prompts property", () => {
    it("should expose getPrompt method", () => {
      expect(typeof client.prompts!.getPrompt).toBe("function");
    });

    it("should expose preload method", () => {
      expect(typeof client.prompts!.preload).toBe("function");
    });

    it("should expose clearCache method", () => {
      expect(typeof client.prompts!.clearCache).toBe("function");
    });

    it("should expose getCacheStats method", () => {
      expect(typeof client.prompts!.getCacheStats).toBe("function");
    });
  });

  describe("prompt helper", () => {
    it("should create prompt helper for agent", () => {
      const helper = client.createPromptHelper("test-agent-id");
      expect(helper).toBeDefined();
      expect(typeof helper.getPrompt).toBe("function");
    });

    it("should throw error when prompts are disabled", async () => {
      const disabledOptions: VoltOpsClientOptions = {
        ...mockOptions,
        prompts: false,
      };

      const disabledClient = new VoltOpsClient(disabledOptions);
      const helper = disabledClient.createPromptHelper("test-agent-id");

      await expect(() => helper.getPrompt({ promptName: "test" })).rejects.toThrow(
        "Prompt management is not enabled in VoltOpsClient",
      );
    });
  });

  describe("management methods", () => {
    it("should check if prompt management is enabled", () => {
      expect(client.isPromptManagementEnabled()).toBe(true);
    });

    it("should get prompt manager", () => {
      expect(client.getPromptManager()).toBe(mockPromptManager);
    });

    it("should dispose resources", async () => {
      await client.dispose();
      expect(mockPromptManager.clearCache).toHaveBeenCalledOnce();
    });
  });

  describe("options property", () => {
    it("should store baseUrl correctly", () => {
      expect(client.options.baseUrl).toBe("https://api.voltops.com");
    });

    it("should store publicKey correctly", () => {
      expect(client.options.publicKey).toBe("pub_test_key");
    });

    it("should store secretKey correctly", () => {
      expect(client.options.secretKey).toBe("sec_test_key");
    });

    it("should handle optional fetch parameter", () => {
      const customFetch = vi.fn();
      const optionsWithFetch = { ...mockOptions, fetch: customFetch };
      const clientWithFetch = new VoltOpsClient(optionsWithFetch);

      expect(clientWithFetch.options.fetch).toBe(customFetch);
    });
  });

  describe("type checking", () => {
    it("should implement IVoltOpsClient interface", () => {
      expectTypeOf(client).toMatchTypeOf<IVoltOpsClient>();
    });
  });
});

describe("createVoltOpsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create VoltOpsClient instance", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://api.voltops.com",
      publicKey: "pub_test_key",
      secretKey: "sec_test_key",
    };

    const client = createVoltOpsClient(options);

    expect(client).toBeInstanceOf(VoltOpsClient);
  });

  it("should pass options with defaults to client constructor", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://custom.voltops.com",
      publicKey: "custom_pub_key",
      secretKey: "custom_sec_key",
      fetch: vi.fn(),
    };

    const client = createVoltOpsClient(options);

    // Check that options are merged with defaults
    expect(client.options.baseUrl).toBe(options.baseUrl);
    expect(client.options.publicKey).toBe(options.publicKey);
    expect(client.options.secretKey).toBe(options.secretKey);
    expect(client.options.fetch).toBe(options.fetch);
    expect(client.options.telemetry).toBe(true); // default
    expect(client.options.prompts).toBe(true); // default
  });

  it("should return client with working prompts interface", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://api.voltops.com",
      publicKey: "pub_key",
      secretKey: "sec_key",
    };

    const client = createVoltOpsClient(options);

    expect(client.prompts).toBeDefined();
    expect(typeof client.prompts!.getPrompt).toBe("function");
    expect(typeof client.prompts!.preload).toBe("function");
    expect(typeof client.prompts!.clearCache).toBe("function");
    expect(typeof client.prompts!.getCacheStats).toBe("function");
  });
});
