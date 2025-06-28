import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { VoltOpsPromptManagerImpl } from "./prompt-manager";
import type { VoltOpsClientOptions, PromptReference } from "./types";

// Mock for VoltOpsPromptApiClient
const mockApiClient = {
  fetchPrompt: vi.fn(),
};

// Mock the API client module
vi.mock("./prompt-api-client", () => ({
  VoltOpsPromptApiClient: vi.fn(() => mockApiClient),
}));

describe("VoltOpsPromptManagerImpl", () => {
  let manager: VoltOpsPromptManagerImpl;
  const mockOptions: VoltOpsClientOptions = {
    baseUrl: "https://api.voltops.com",
    publicKey: "pub_test_key",
    secretKey: "sec_test_key",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    manager = new VoltOpsPromptManagerImpl(mockOptions);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create manager instance", () => {
      expect(manager).toBeInstanceOf(VoltOpsPromptManagerImpl);
    });

    it("should initialize empty cache", () => {
      const stats = manager.getCacheStats();
      expect(stats.size).toBe(0);
    });
  });

  describe("getPrompt", () => {
    beforeEach(() => {
      mockApiClient.fetchPrompt.mockResolvedValue({ content: "Hello {{name}}!" });
    });

    it("should fetch prompt from API when not cached", async () => {
      const request: PromptReference = { promptName: "test-prompt" };

      const result = await manager.getPrompt(request);

      expect(mockApiClient.fetchPrompt).toHaveBeenCalledWith(request);
      expect(result).toBe("Hello {{name}}!");
    });

    it("should apply template variables", async () => {
      const request: PromptReference = {
        promptName: "test-prompt",
        variables: { name: "World" },
      };

      const result = await manager.getPrompt(request);

      expect(result).toBe("Hello World!");
    });

    it("should use cached prompt on second call", async () => {
      const request: PromptReference = { promptName: "test-prompt" };

      // First call
      await manager.getPrompt(request);

      // Second call
      await manager.getPrompt(request);

      // API should only be called once
      expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(1);
    });

    it("should handle specific version requests", async () => {
      const request: PromptReference = {
        promptName: "test-prompt",
        version: 2,
      };

      await manager.getPrompt(request);

      expect(mockApiClient.fetchPrompt).toHaveBeenCalledWith(request);
    });

    it("should throw error when API call fails", async () => {
      const apiError = new Error("API Error");
      mockApiClient.fetchPrompt.mockRejectedValue(apiError);

      const request: PromptReference = { promptName: "test-prompt" };

      await expect(manager.getPrompt(request)).rejects.toThrow("API Error");
    });
  });

  describe("preload", () => {
    beforeEach(() => {
      mockApiClient.fetchPrompt
        .mockResolvedValueOnce({ content: "Prompt 1" })
        .mockResolvedValueOnce({ content: "Prompt 2" });
    });

    it("should preload multiple prompts", async () => {
      const requests: PromptReference[] = [{ promptName: "prompt-1" }, { promptName: "prompt-2" }];

      await manager.preload(requests);

      expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
      expect(mockApiClient.fetchPrompt).toHaveBeenCalledWith(requests[0]);
      expect(mockApiClient.fetchPrompt).toHaveBeenCalledWith(requests[1]);
    });

    it("should handle empty preload array", async () => {
      await manager.preload([]);

      expect(mockApiClient.fetchPrompt).not.toHaveBeenCalled();
    });

    it("should continue preloading even if one fails", async () => {
      mockApiClient.fetchPrompt
        .mockRejectedValueOnce(new Error("Failed"))
        .mockResolvedValueOnce({ content: "Prompt 2" });

      const requests: PromptReference[] = [{ promptName: "prompt-1" }, { promptName: "prompt-2" }];

      await manager.preload(requests);

      expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearCache", () => {
    it("should clear all cached prompts", async () => {
      // Add something to cache first
      mockApiClient.fetchPrompt.mockResolvedValue({ content: "Hello!" });

      await manager.getPrompt({ promptName: "test-prompt" });

      // Verify cache has content
      expect(manager.getCacheStats().size).toBe(1);

      // Clear cache
      manager.clearCache();

      // Verify cache is empty
      expect(manager.getCacheStats().size).toBe(0);
    });
  });

  describe("getCacheStats", () => {
    it("should return correct cache statistics", async () => {
      // Initially empty
      let stats = manager.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.entries).toEqual([]);

      // Add item to cache
      mockApiClient.fetchPrompt.mockResolvedValue({ content: "Hello!" });

      await manager.getPrompt({ promptName: "test-prompt" });

      // Check updated stats
      stats = manager.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toEqual(["test-prompt:latest"]);
    });
  });

  describe("cache expiration", () => {
    it("should expire cached items after TTL", async () => {
      mockApiClient.fetchPrompt.mockResolvedValue({ content: "Hello!" });

      // First call - should hit API
      await manager.getPrompt({ promptName: "test-prompt" });
      expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(1);

      // Fast forward 6 minutes (past TTL)
      vi.advanceTimersByTime(6 * 60 * 1000);

      // Second call - should hit API again due to expiration
      await manager.getPrompt({ promptName: "test-prompt" });
      expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
    });
  });
});
