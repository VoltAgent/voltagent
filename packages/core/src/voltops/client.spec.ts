import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectTypeOf } from "vitest";
import { VoltOpsClient, createVoltOpsClient } from "./client";
import type { VoltOpsClient as IVoltOpsClient, VoltOpsClientOptions } from "./types";

// Hoist mock logger instance creation
const { mockLoggerInstance } = vi.hoisted(() => {
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

  return { mockLoggerInstance };
});

// Mock the logger module
vi.mock("../logger", () => {
  class MockLoggerProxy {
    trace = mockLoggerInstance.trace;
    debug = mockLoggerInstance.debug;
    info = mockLoggerInstance.info;
    warn = mockLoggerInstance.warn;
    error = mockLoggerInstance.error;
    fatal = mockLoggerInstance.fatal;
    child = mockLoggerInstance.child;
  }

  return {
    LoggerProxy: MockLoggerProxy,
  };
});

// Mock message builder module
vi.mock("../logger/message-builder", () => ({
  buildVoltOpsLogMessage: vi.fn((_resource, _action, message) => message),
  buildLogContext: vi.fn((_resourceType, _resource, _action, data) => data),
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

  describe("hasValidKeys", () => {
    it("should return true for valid keys", () => {
      const validOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pk_valid_key",
        secretKey: "sk_valid_key",
      };

      const client = new VoltOpsClient(validOptions);
      expect(client.hasValidKeys()).toBe(true);
    });

    it("should return false when publicKey is empty", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "",
        secretKey: "sk_valid_key",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.hasValidKeys()).toBe(false);
    });

    it("should return false when secretKey is empty", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pk_valid_key",
        secretKey: "",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.hasValidKeys()).toBe(false);
    });

    it("should return false when publicKey doesn't have correct prefix", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "invalid_key_format",
        secretKey: "sk_valid_key",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.hasValidKeys()).toBe(false);
    });

    it("should return false when secretKey doesn't have correct prefix", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pk_valid_key",
        secretKey: "invalid_key_format",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.hasValidKeys()).toBe(false);
    });

    it("should return false for both empty keys", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "",
        secretKey: "",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.hasValidKeys()).toBe(false);
    });

    it("should handle whitespace-only keys as invalid", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "   ",
        secretKey: "sk_valid_key",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.hasValidKeys()).toBe(false);
    });

    it("should return false for both incorrect prefixes", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "invalid_public_format",
        secretKey: "invalid_secret_format",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.hasValidKeys()).toBe(false);
    });
  });

  describe("service initialization", () => {
    it("should not initialize services with invalid keys", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "",
        secretKey: "",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.prompts).toBeUndefined();
    });

    it("should not initialize services with missing prefixes", () => {
      const invalidOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "invalid_key",
        secretKey: "invalid_key",
      };

      const client = new VoltOpsClient(invalidOptions);
      expect(client.prompts).toBeUndefined();
    });

    it("should initialize services with valid keys", () => {
      const validOptions: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pk_valid_key",
        secretKey: "sk_valid_key",
      };

      const client = new VoltOpsClient(validOptions);
      expect(client.prompts).toBeDefined();
    });
  });

  describe("prompts property", () => {
    it("should expose getPrompt method", () => {
      expect(typeof client.prompts?.getPrompt).toBe("function");
    });

    it("should expose preload method", () => {
      expect(typeof client.prompts?.preload).toBe("function");
    });

    it("should expose clearCache method", () => {
      expect(typeof client.prompts?.clearCache).toBe("function");
    });

    it("should expose getCacheStats method", () => {
      expect(typeof client.prompts?.getCacheStats).toBe("function");
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

  describe("actions client", () => {
    const originalFetch = globalThis.fetch;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            actionId: "airtable.createRecord",
            provider: "airtable",
            requestPayload: {},
            responsePayload: { id: "rec123" },
            metadata: null,
          },
        }),
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;
    });

    afterAll(() => {
      globalThis.fetch = originalFetch;
    });

    it("should execute Airtable createRecord via project endpoint", async () => {
      const result = await client.actions.airtable.createRecord({
        credentialId: "cred-airtable",
        baseId: "base123",
        tableId: "table456",
        fields: { Name: "Ada" },
      });

      expect(result.actionId).toBe("airtable.createRecord");
      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.voltops.com/actions/project/run",
        expect.objectContaining({
          method: "POST",
        }),
      );
      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body ?? "{}");
      expect(body.actionId).toBe("airtable.createRecord");
      expect(body.config.airtable).toEqual({
        baseId: "base123",
        tableId: "table456",
        typecast: false,
        returnFieldsByFieldId: false,
      });
      expect(body.payload.input.fields).toEqual({ Name: "Ada" });
    });

    it("should execute Slack postMessage via project endpoint", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            actionId: "slack.postMessage",
            provider: "slack",
            requestPayload: {},
            responsePayload: { ok: true },
          },
        }),
      });

      const result = await client.actions.slack.postMessage({
        credentialId: "cred-slack",
        channelId: "C123",
        text: "Hello world",
      });

      expect(result.provider).toBe("slack");
      const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body ?? "{}");
      expect(requestBody.actionId).toBe("slack.postMessage");
      expect(requestBody.config.slack).toEqual({
        channelId: "C123",
        channelLabel: null,
        defaultThreadTs: null,
      });
      expect(requestBody.payload.input.text).toBe("Hello world");
    });

    it("should execute Slack deleteMessage via project endpoint", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            actionId: "slack.deleteMessage",
            provider: "slack",
            requestPayload: {},
            responsePayload: { ok: true },
          },
        }),
      });

      await client.actions.slack.deleteMessage({
        credentialId: "cred-slack",
        channelId: "C999",
        messageTs: "1720472000.000200",
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body ?? "{}");
      expect(body.actionId).toBe("slack.deleteMessage");
      expect(body.config.slack.channelId).toBe("C999");
      expect(body.payload.input.messageTs).toBe("1720472000.000200");
    });

    it("should execute Slack searchMessages without slack config", async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            actionId: "slack.searchMessages",
            provider: "slack",
            requestPayload: {},
            responsePayload: { ok: true },
          },
        }),
      });

      await client.actions.slack.searchMessages({
        credentialId: "cred-slack",
        query: '"outage" in:C123',
        limit: 10,
      });

      const body = JSON.parse(fetchMock.mock.calls[0][1]?.body ?? "{}");
      expect(body.actionId).toBe("slack.searchMessages");
      expect(body.config).toBeNull();
      expect(body.payload.input.query).toBe('"outage" in:C123');
      expect(body.payload.input.limit).toBe(10);
    });
  });
});

describe("createVoltOpsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    expect(typeof client.prompts?.getPrompt).toBe("function");
    expect(typeof client.prompts?.preload).toBe("function");
    expect(typeof client.prompts?.clearCache).toBe("function");
    expect(typeof client.prompts?.getCacheStats).toBe("function");
  });
});
