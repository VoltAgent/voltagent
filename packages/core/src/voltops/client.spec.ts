import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { VoltOpsClientImpl, createVoltOpsClient } from "./client";
import type { VoltOpsClientOptions } from "./types";

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

describe("VoltOpsClientImpl", () => {
  let client: VoltOpsClientImpl;
  const mockOptions: VoltOpsClientOptions = {
    baseUrl: "https://api.voltops.com",
    publicKey: "pub_test_key",
    secretKey: "sec_test_key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new VoltOpsClientImpl(mockOptions);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create client instance with correct options", () => {
      expect(client).toBeInstanceOf(VoltOpsClientImpl);
      expect(client.options).toEqual(mockOptions);
    });

    it("should initialize prompts manager", () => {
      expect(client.prompts).toBeDefined();
      expect(client.prompts).toBe(mockPromptManager);
    });
  });

  describe("prompts property", () => {
    it("should expose getPrompt method", () => {
      expect(typeof client.prompts.getPrompt).toBe("function");
    });

    it("should expose preload method", () => {
      expect(typeof client.prompts.preload).toBe("function");
    });

    it("should expose clearCache method", () => {
      expect(typeof client.prompts.clearCache).toBe("function");
    });

    it("should expose getCacheStats method", () => {
      expect(typeof client.prompts.getCacheStats).toBe("function");
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
      const clientWithFetch = new VoltOpsClientImpl(optionsWithFetch);

      expect(clientWithFetch.options.fetch).toBe(customFetch);
    });
  });
});

describe("createVoltOpsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create VoltOpsClientImpl instance", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://api.voltops.com",
      publicKey: "pub_test_key",
      secretKey: "sec_test_key",
    };

    const client = createVoltOpsClient(options);

    expect(client).toBeInstanceOf(VoltOpsClientImpl);
  });

  it("should pass all options to client constructor", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://custom.voltops.com",
      publicKey: "custom_pub_key",
      secretKey: "custom_sec_key",
      fetch: vi.fn(),
    };

    const client = createVoltOpsClient(options);

    expect(client.options).toEqual(options);
  });

  it("should return client with working prompts interface", () => {
    const options: VoltOpsClientOptions = {
      baseUrl: "https://api.voltops.com",
      publicKey: "pub_key",
      secretKey: "sec_key",
    };

    const client = createVoltOpsClient(options);

    expect(client.prompts).toBeDefined();
    expect(typeof client.prompts.getPrompt).toBe("function");
    expect(typeof client.prompts.preload).toBe("function");
    expect(typeof client.prompts.clearCache).toBe("function");
    expect(typeof client.prompts.getCacheStats).toBe("function");
  });
});
