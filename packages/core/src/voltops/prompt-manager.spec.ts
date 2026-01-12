import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { expectTypeOf } from "vitest";
import { VoltOpsPromptManagerImpl } from "./prompt-manager";
import type {
  PromptContent,
  PromptReference,
  VoltOpsClientOptions,
  VoltOpsPromptManager,
} from "./types";

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

    it("should use default cache configuration when not provided", () => {
      const stats = manager.getCacheStats();
      expect(stats.size).toBe(0);
      // Cache should be enabled by default - test by checking behavior
    });

    it("should use custom cache configuration when provided", () => {
      const customOptions: VoltOpsClientOptions = {
        ...mockOptions,
        promptCache: {
          enabled: true,
          ttl: 10 * 60, // 10 minutes
          maxSize: 50,
        },
      };

      const customManager = new VoltOpsPromptManagerImpl(customOptions);
      expect(customManager).toBeInstanceOf(VoltOpsPromptManagerImpl);
    });
  });

  describe("cache configuration", () => {
    describe("when cache is enabled", () => {
      let enabledManager: VoltOpsPromptManagerImpl;

      beforeEach(() => {
        const enabledOptions: VoltOpsClientOptions = {
          ...mockOptions,
          promptCache: {
            enabled: true,
            ttl: 300, // 5 minutes
            maxSize: 10,
          },
        };
        enabledManager = new VoltOpsPromptManagerImpl(enabledOptions);
      });

      it("should cache responses", async () => {
        mockApiClient.fetchPrompt.mockResolvedValue({
          prompt: {
            type: "text",
            text: "Hello {{name}}!",
          },
          type: "text",
          name: "test-prompt",
          version: "latest",
        });

        const request: PromptReference = { promptName: "test-prompt" };

        // First call
        await enabledManager.getPrompt(request);
        // Second call
        await enabledManager.getPrompt(request);

        // API should only be called once due to caching
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(1);
      });

      it("should respect custom TTL", async () => {
        const shortTtlOptions: VoltOpsClientOptions = {
          ...mockOptions,
          promptCache: {
            enabled: true,
            ttl: 2, // 2 seconds
            maxSize: 10,
          },
        };
        const shortTtlManager = new VoltOpsPromptManagerImpl(shortTtlOptions);

        mockApiClient.fetchPrompt.mockResolvedValue({
          prompt: {
            type: "text",
            text: "Hello!",
          },
          type: "text",
          name: "test-prompt",
          version: "latest",
        });

        // First call
        await shortTtlManager.getPrompt({ promptName: "test-prompt" });
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(1);

        // Advance time by 3 seconds (past TTL)
        vi.advanceTimersByTime(3 * 1000);

        // Second call - should hit API again
        await shortTtlManager.getPrompt({ promptName: "test-prompt" });
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
      });
    });

    describe("when cache is disabled", () => {
      let disabledManager: VoltOpsPromptManagerImpl;

      beforeEach(() => {
        const disabledOptions: VoltOpsClientOptions = {
          ...mockOptions,
          promptCache: {
            enabled: false,
            ttl: 300,
            maxSize: 10,
          },
        };
        disabledManager = new VoltOpsPromptManagerImpl(disabledOptions);
      });

      it("should not cache responses", async () => {
        mockApiClient.fetchPrompt.mockResolvedValue({
          prompt: {
            type: "text",
            text: "Hello {{name}}!",
          },
          type: "text",
          name: "test-prompt",
          version: "latest",
        });

        const request: PromptReference = { promptName: "test-prompt" };

        // First call
        await disabledManager.getPrompt(request);
        // Second call
        await disabledManager.getPrompt(request);

        // API should be called twice since caching is disabled
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
      });

      it("should maintain empty cache stats", async () => {
        mockApiClient.fetchPrompt.mockResolvedValue({
          prompt: {
            type: "text",
            text: "Hello!",
          },
          type: "text",
          name: "test-prompt",
          version: "latest",
        });

        await disabledManager.getPrompt({ promptName: "test-prompt" });

        const stats = disabledManager.getCacheStats();
        expect(stats.size).toBe(0);
        expect(stats.entries).toEqual([]);
      });
    });
  });

  describe("per-prompt cache configuration", () => {
    describe("when per-prompt cache is enabled while global cache is disabled", () => {
      let disabledGlobalManager: VoltOpsPromptManagerImpl;

      beforeEach(() => {
        const disabledGlobalOptions: VoltOpsClientOptions = {
          ...mockOptions,
          promptCache: {
            enabled: false, // Global cache disabled
            ttl: 300,
            maxSize: 10,
          },
        };
        disabledGlobalManager = new VoltOpsPromptManagerImpl(disabledGlobalOptions);
      });

      it("should use cache for specific prompt when per-prompt cache is enabled", async () => {
        mockApiClient.fetchPrompt.mockResolvedValue({
          prompt: {
            type: "text",
            text: "Hello {{name}}!",
          },
          type: "text",
          name: "test-prompt",
          version: "latest",
        });

        const request: PromptReference = {
          promptName: "test-prompt",
          promptCache: {
            enabled: true, // Override global disabled setting
            ttl: 60,
          },
        };

        // First call
        await disabledGlobalManager.getPrompt(request);
        // Second call
        await disabledGlobalManager.getPrompt(request);

        // Should hit API only once due to per-prompt caching
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(1);
      });

      it("should not cache prompts without per-prompt cache enabled", async () => {
        mockApiClient.fetchPrompt.mockResolvedValue({
          prompt: {
            type: "text",
            text: "Hello!",
          },
          type: "text",
          name: "test-prompt",
          version: "latest",
        });

        const request: PromptReference = {
          promptName: "test-prompt",
          // No per-prompt cache override - should use global (disabled)
        };

        // First call
        await disabledGlobalManager.getPrompt(request);
        // Second call
        await disabledGlobalManager.getPrompt(request);

        // Should hit API twice since global caching is disabled
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
      });
    });

    describe("when per-prompt cache is disabled while global cache is enabled", () => {
      it("should not cache specific prompt when per-prompt cache is disabled", async () => {
        mockApiClient.fetchPrompt.mockResolvedValue({
          prompt: {
            type: "text",
            text: "Hello!",
          },
          type: "text",
          name: "test-prompt",
          version: "latest",
        });

        const request: PromptReference = {
          promptName: "test-prompt",
          promptCache: {
            enabled: false, // Disable cache for this specific prompt
          },
        };

        // First call
        await manager.getPrompt(request);
        // Second call
        await manager.getPrompt(request);

        // Should hit API twice since per-prompt caching is disabled
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
      });

      it("should still cache other prompts with global settings", async () => {
        // Setup separate responses for each prompt
        mockApiClient.fetchPrompt.mockImplementation((request: PromptReference) => {
          if (request.promptName === "disabled-prompt") {
            return Promise.resolve({
              prompt: {
                type: "text",
                text: "Disabled cache prompt",
              },
              type: "text",
              name: "disabled-prompt",
              version: "latest",
            });
          }

          if (request.promptName === "normal-prompt") {
            return Promise.resolve({
              prompt: {
                type: "text",
                text: "Normal prompt",
              },
              type: "text",
              name: "normal-prompt",
              version: "latest",
            });
          }
          return Promise.reject(new Error("Unexpected prompt"));
        });

        const disabledRequest: PromptReference = {
          promptName: "disabled-prompt",
          promptCache: { enabled: false },
        };

        const normalRequest: PromptReference = {
          promptName: "normal-prompt",
          // Uses global cache settings
        };

        // Call disabled cache prompt twice
        await manager.getPrompt(disabledRequest);
        await manager.getPrompt(disabledRequest);

        // Call normal prompt twice
        await manager.getPrompt(normalRequest);
        await manager.getPrompt(normalRequest);

        // Disabled prompt should hit API twice, normal prompt only once
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(3);
      });
    });

    describe("when per-prompt custom TTL is specified", () => {
      it("should use custom TTL for specific prompt", async () => {
        mockApiClient.fetchPrompt.mockResolvedValue({
          prompt: {
            type: "text",
            text: "Hello!",
          },
          type: "text",
          name: "test-prompt",
          version: "latest",
        });

        const request: PromptReference = {
          promptName: "test-prompt",
          promptCache: {
            enabled: true,
            ttl: 30, // 30 seconds instead of global 300 seconds
          },
        };

        // First call - should hit API
        await manager.getPrompt(request);
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(1);

        // Fast forward 35 seconds (past custom TTL but within global TTL)
        vi.advanceTimersByTime(35 * 1000);

        // Second call - should hit API again due to custom TTL expiration
        await manager.getPrompt(request);
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
      });

      it("should not affect TTL of other cached prompts", async () => {
        // Setup separate responses for each prompt
        mockApiClient.fetchPrompt.mockImplementation((request: PromptReference) => {
          if (request.promptName === "short-ttl-prompt") {
            return Promise.resolve({
              prompt: {
                type: "text",
                text: "Short TTL prompt",
              },
              type: "text",
              name: "short-ttl-prompt",
              version: "latest",
            });
          }
          if (request.promptName === "normal-ttl-prompt") {
            return Promise.resolve({
              prompt: {
                type: "text",
                text: "Normal TTL prompt",
              },
              type: "text",
              name: "normal-ttl-prompt",
              version: "latest",
            });
          }
          return Promise.reject(new Error("Unexpected prompt"));
        });

        const shortTtlRequest: PromptReference = {
          promptName: "short-ttl-prompt",
          promptCache: { enabled: true, ttl: 30 },
        };

        const normalTtlRequest: PromptReference = {
          promptName: "normal-ttl-prompt",
        };

        // Cache both prompts
        await manager.getPrompt(shortTtlRequest);
        await manager.getPrompt(normalTtlRequest);

        // Fast forward 35 seconds
        vi.advanceTimersByTime(35 * 1000);

        // Short TTL prompt should be expired
        await manager.getPrompt(shortTtlRequest);
        // Normal TTL prompt should still be cached
        await manager.getPrompt(normalTtlRequest);

        // Should have 3 API calls total (2 initial + 1 expired short TTL)
        expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(3);
      });
    });

    describe("type checking for per-prompt cache", () => {
      it("should have correct PromptReference interface with promptCache", () => {
        expectTypeOf<PromptReference>().toMatchTypeOf<{
          promptName: string;
          version?: number;
          label?: string;
          variables?: Record<string, any>;
          promptCache?: {
            enabled?: boolean;
            ttl?: number;
            maxSize?: number;
          };
        }>();
      });

      it("should allow partial promptCache configuration", () => {
        const reference: PromptReference = {
          promptName: "test",
          promptCache: {
            enabled: true,
            // ttl and maxSize are optional
          },
        };

        expect(reference.promptCache?.enabled).toBe(true);
        expect(reference.promptCache?.ttl).toBeUndefined();
        expect(reference.promptCache?.maxSize).toBeUndefined();
      });
    });
  });

  describe("cache size limits and eviction", () => {
    let limitedManager: VoltOpsPromptManagerImpl;

    beforeEach(() => {
      const limitedOptions: VoltOpsClientOptions = {
        ...mockOptions,
        promptCache: {
          enabled: true,
          ttl: 300,
          maxSize: 3, // Small cache for testing eviction
        },
      };
      limitedManager = new VoltOpsPromptManagerImpl(limitedOptions);
    });

    it("should enforce cache size limits", async () => {
      // Mock responses for different prompts
      mockApiClient.fetchPrompt
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "Prompt 1",
          },
          type: "text",
          name: "prompt-1",
          version: "latest",
        })
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "Prompt 2",
          },
          type: "text",
          name: "prompt-2",
          version: "latest",
        })
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "Prompt 3",
          },
          type: "text",
          name: "prompt-3",
          version: "latest",
        })
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "Prompt 4",
          },
          type: "text",
          name: "prompt-4",
          version: "latest",
        });

      // Fill cache to maxSize (3)
      await limitedManager.getPrompt({ promptName: "prompt-1" });
      await limitedManager.getPrompt({ promptName: "prompt-2" });
      await limitedManager.getPrompt({ promptName: "prompt-3" });

      // Cache should be at maxSize
      expect(limitedManager.getCacheStats().size).toBe(3);

      // Add fourth prompt - should trigger eviction
      await limitedManager.getPrompt({ promptName: "prompt-4" });

      // Cache should still be at maxSize
      expect(limitedManager.getCacheStats().size).toBe(3);

      // First prompt should have been evicted (FIFO)
      const stats = limitedManager.getCacheStats();
      expect(stats.entries).not.toContain("prompt-1:latest");
      expect(stats.entries).toContain("prompt-4:latest");
    });

    it("should evict oldest entry when cache is full", async () => {
      mockApiClient.fetchPrompt
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "Old prompt",
          },
          type: "text",
          name: "old-prompt",
          version: "latest",
        })
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "Middle prompt",
          },
          type: "text",
          name: "middle-prompt",
          version: "latest",
        })
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "New prompt 1",
          },
          type: "text",
          name: "new-prompt-1",
          version: "latest",
        })
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "New prompt 2",
          },
          type: "text",
          name: "new-prompt-2",
          version: "latest",
        });

      // Fill cache in order
      await limitedManager.getPrompt({ promptName: "old-prompt" });
      await limitedManager.getPrompt({ promptName: "middle-prompt" });
      await limitedManager.getPrompt({ promptName: "new-prompt-1" });

      // Add fourth prompt
      await limitedManager.getPrompt({ promptName: "new-prompt-2" });

      const stats = limitedManager.getCacheStats();
      // oldest should be evicted
      expect(stats.entries).not.toContain("old-prompt:latest");
      expect(stats.entries).toContain("middle-prompt:latest");
      expect(stats.entries).toContain("new-prompt-1:latest");
      expect(stats.entries).toContain("new-prompt-2:latest");
    });
  });

  describe("getPrompt", () => {
    beforeEach(() => {
      mockApiClient.fetchPrompt.mockResolvedValue({
        prompt: {
          type: "text",
          text: "Hello {{name}}!",
        },
        type: "text",
        name: "test-prompt",
        version: "latest",
      });
    });

    it("should fetch prompt from API when not cached", async () => {
      const request: PromptReference = { promptName: "test-prompt" };

      const result = await manager.getPrompt(request);

      expect(mockApiClient.fetchPrompt).toHaveBeenCalledWith(request);
      expect(result.type).toBe("text");
      expect(result.text).toBe("Hello {{name}}!");
    });

    it("should apply template variables", async () => {
      const request: PromptReference = {
        promptName: "test-prompt",
        variables: { name: "World" },
      };

      const result = await manager.getPrompt(request);

      expect(result.type).toBe("text");
      expect(result.text).toBe("Hello World!");
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

    it("should preserve metadata in prompt content", async () => {
      mockApiClient.fetchPrompt.mockResolvedValue({
        prompt: {
          type: "text",
          text: "Hello world!",
        },
        type: "text",
        name: "test-prompt",
        version: "v1.0",
        labels: ["production"],
        tags: ["greeting"],
        config: { temperature: 0.7 },
      });

      const result = await manager.getPrompt({ promptName: "test-prompt" });

      expect(result.metadata).toEqual({
        name: "test-prompt",
        version: "v1.0",
        labels: ["production"],
        tags: ["greeting"],
        source: "online",
        config: { temperature: 0.7 },
      });
    });
  });

  describe("preload", () => {
    beforeEach(() => {
      mockApiClient.fetchPrompt
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "Prompt 1",
          },
          type: "text",
          name: "prompt-1",
          version: "latest",
        })
        .mockResolvedValueOnce({
          prompt: {
            type: "text",
            text: "Prompt 2",
          },
          type: "text",
          name: "prompt-2",
          version: "latest",
        });
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
      mockApiClient.fetchPrompt.mockRejectedValueOnce(new Error("Failed")).mockResolvedValueOnce({
        prompt: {
          type: "text",
          text: "Prompt 2",
        },
        type: "text",
        name: "prompt-2",
        version: "latest",
      });

      const requests: PromptReference[] = [{ promptName: "prompt-1" }, { promptName: "prompt-2" }];

      await manager.preload(requests);

      expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(2);
    });
  });

  describe("clearCache", () => {
    it("should clear all cached prompts", async () => {
      // Add something to cache first
      mockApiClient.fetchPrompt.mockResolvedValue({
        prompt: {
          type: "text",
          text: "Hello!",
        },
        type: "text",
        name: "test-prompt",
        version: "latest",
      });

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
      mockApiClient.fetchPrompt.mockResolvedValue({
        prompt: {
          type: "text",
          text: "Hello!",
        },
        type: "text",
        name: "test-prompt",
        version: "latest",
      });

      await manager.getPrompt({ promptName: "test-prompt" });

      // Check updated stats
      stats = manager.getCacheStats();
      expect(stats.size).toBe(1);
      expect(stats.entries).toEqual(["test-prompt:latest"]);
    });
  });

  describe("cache expiration", () => {
    it("should expire cached items after TTL", async () => {
      mockApiClient.fetchPrompt.mockResolvedValue({
        prompt: {
          type: "text",
          text: "Hello!",
        },
        type: "text",
        name: "test-prompt",
        version: "latest",
      });

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

  describe("chat prompts", () => {
    it("should handle chat type prompts with messages", async () => {
      mockApiClient.fetchPrompt.mockResolvedValue({
        prompt: {
          type: "chat",
          messages: [
            { role: "system", content: "You are a helpful assistant." },
            { role: "user", content: "Hello {{name}}!" },
          ],
        },
        type: "chat",
        name: "chat-prompt",
        version: "latest",
      });

      const result = await manager.getPrompt({
        promptName: "chat-prompt",
        variables: { name: "World" },
      });

      expect(result.type).toBe("chat");
      expect(result.messages).toHaveLength(2);
      expect(result.messages?.[0].content).toBe("You are a helpful assistant.");
      expect(result.messages?.[1].content).toBe("Hello World!");
    });

    it("should cache chat prompts correctly", async () => {
      mockApiClient.fetchPrompt.mockResolvedValue({
        prompt: {
          type: "chat",
          messages: [{ role: "user", content: "Hello!" }],
        },
        type: "chat",
        name: "chat-prompt",
        version: "latest",
      });

      // First call
      await manager.getPrompt({ promptName: "chat-prompt" });
      // Second call
      await manager.getPrompt({ promptName: "chat-prompt" });

      // Should only hit API once due to caching
      expect(mockApiClient.fetchPrompt).toHaveBeenCalledTimes(1);
    });
  });

  describe("type checking", () => {
    it("should have correct VoltOpsPromptManager interface", () => {
      expectTypeOf<VoltOpsPromptManager>().toEqualTypeOf<{
        getPrompt: (reference: PromptReference) => Promise<PromptContent>;
        preload: (references: PromptReference[]) => Promise<void>;
        clearCache: () => void;
        getCacheStats: () => { size: number; entries: string[] };
      }>();
    });

    it("should have correct PromptContent interface", () => {
      expectTypeOf<PromptContent>().toMatchTypeOf<{
        type: "text" | "chat";
        text?: string;
        messages?: Array<{ role: string; content: any }>;
        metadata?: any;
      }>();
    });

    it("should implement VoltOpsPromptManager interface", () => {
      expectTypeOf(manager).toMatchTypeOf<VoltOpsPromptManager>();
    });
  });
});
