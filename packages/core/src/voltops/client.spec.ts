import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { expectTypeOf } from "vitest";
import { VoltOpsClient, createVoltOpsClient } from "./client";
import type { VoltOpsClientOptions, VoltOpsClient as IVoltOpsClient } from "./types";
import { getGlobalLogger } from "../logger";

// Mock the logger
const mockLoggerInstance = {
  trace: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  fatal: vi.fn(),
  child: vi.fn(),
};

// Set up child to return itself
mockLoggerInstance.child.mockReturnValue(mockLoggerInstance);

vi.mock("../logger", () => ({
  getGlobalLogger: vi.fn(() => mockLoggerInstance),
  LogEvents: {
    VOLTOPS_CLIENT_INITIALIZED: "voltops.client.initialized",
  },
}));

// Mock message builder module
vi.mock("../logger/message-builder", () => ({
  buildVoltOpsLogMessage: vi.fn((resource, action, message) => message),
  buildLogContext: vi.fn((resourceType, resource, action, data) => data),
  ResourceType: {
    VOLTOPS: "voltops",
  },
}));

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

// Mock observability exporter
vi.mock("../telemetry/exporter", () => ({
  VoltAgentExporter: vi.fn(() => ({
    exportHistoryEntry: vi.fn(),
    exportHistoryEntryAsync: vi.fn(),
    exportTimelineEvent: vi.fn(),
    exportTimelineEventAsync: vi.fn(),
  })),
}));

describe("VoltOpsClient", () => {
  let client: VoltOpsClient;

  const mockOptions: VoltOpsClientOptions = {
    baseUrl: "https://api.voltops.com",
    publicKey: "pk_test_key",
    secretKey: "sk_test_key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Ensure logger mock is properly set up before creating client
    mockLoggerInstance.child.mockReturnValue(mockLoggerInstance);
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

  describe("API key validation", () => {
    it("should validate correct API keys without warnings", () => {
      const validOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pk_valid_key",
        secretKey: "sk_valid_key",
      };

      new VoltOpsClient(validOptions);

      expect(mockLoggerInstance.warn).not.toHaveBeenCalled();
    });

    it("should warn when publicKey is missing", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "",
        secretKey: "sk_valid_key",
      };

      new VoltOpsClient(invalidOptions);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining("⚠️  VoltOps Warning: Missing publicKey"),
      );
    });

    it("should warn when secretKey is missing", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pk_valid_key",
        secretKey: "",
      };

      new VoltOpsClient(invalidOptions);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining("⚠️  VoltOps Warning: Missing secretKey"),
      );
    });

    it("should warn when publicKey doesn't have correct prefix", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "invalid_key_format",
        secretKey: "sk_valid_key",
      };

      new VoltOpsClient(invalidOptions);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "⚠️  VoltOps Warning: publicKey should start with 'pk_'",
      );
    });

    it("should warn when secretKey doesn't have correct prefix", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pk_valid_key",
        secretKey: "invalid_key_format",
      };

      new VoltOpsClient(invalidOptions);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "⚠️  VoltOps Warning: secretKey should start with 'sk_'",
      );
    });

    it("should warn for both missing keys", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "",
        secretKey: "",
      };

      new VoltOpsClient(invalidOptions);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining("⚠️  VoltOps Warning: Missing publicKey"),
      );
      // Should return early after first missing key, so secretKey warning won't be called
      expect(mockLoggerInstance.warn).toHaveBeenCalledTimes(1);
    });

    it("should handle whitespace-only keys as missing", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "   ",
        secretKey: "sk_valid_key",
      };

      new VoltOpsClient(invalidOptions);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        expect.stringContaining("⚠️  VoltOps Warning: Missing publicKey"),
      );
    });

    it("should warn for both format issues", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "invalid_public_format",
        secretKey: "invalid_secret_format",
      };

      new VoltOpsClient(invalidOptions);

      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "⚠️  VoltOps Warning: publicKey should start with 'pk_'",
      );
      expect(mockLoggerInstance.warn).toHaveBeenCalledWith(
        "⚠️  VoltOps Warning: secretKey should start with 'sk_'",
      );
      expect(mockLoggerInstance.warn).toHaveBeenCalledTimes(2);
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
      expect(client.options.publicKey).toBe("pk_test_key");
    });

    it("should store secretKey correctly", () => {
      expect(client.options.secretKey).toBe("sk_test_key");
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
    // Ensure logger mock is properly set up before creating client
    mockLoggerInstance.child.mockReturnValue(mockLoggerInstance);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should create VoltOpsClient instance", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://api.voltops.com",
      publicKey: "pk_test_key",
      secretKey: "sk_test_key",
    };

    const client = createVoltOpsClient(options);

    expect(client).toBeInstanceOf(VoltOpsClient);
  });

  it("should pass options with defaults to client constructor", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://custom.voltops.com",
      publicKey: "pk_custom_key",
      secretKey: "sk_custom_key",
      fetch: vi.fn(),
    };

    const client = createVoltOpsClient(options);

    // Check that options are merged with defaults
    expect(client.options.baseUrl).toBe(options.baseUrl);
    expect(client.options.publicKey).toBe(options.publicKey);
    expect(client.options.secretKey).toBe(options.secretKey);
    expect(client.options.fetch).toBe(options.fetch);
    expect(client.options.observability).toBe(true); // default
    expect(client.options.prompts).toBe(true); // default
  });

  it("should return client with working prompts interface", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://api.voltops.com",
      publicKey: "pk_key",
      secretKey: "sk_key",
    };

    const client = createVoltOpsClient(options);

    expect(client.prompts).toBeDefined();
    expect(typeof client.prompts!.getPrompt).toBe("function");
    expect(typeof client.prompts!.preload).toBe("function");
    expect(typeof client.prompts!.clearCache).toBe("function");
    expect(typeof client.prompts!.getCacheStats).toBe("function");
  });
});
