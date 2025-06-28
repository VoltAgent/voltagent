import { vi, describe, expect, it, expectTypeOf } from "vitest";
import type {
  PromptReference,
  PromptHelper,
  VoltOpsClientOptions,
  CachedPrompt,
  PromptApiClient,
  VoltOpsPromptManager,
  VoltOpsClient,
} from "./types";

describe("VoltOps Types", () => {
  describe("PromptReference", () => {
    it("should accept minimal prompt reference", () => {
      const ref: PromptReference = {
        promptName: "test-prompt",
      };

      expect(ref.promptName).toBe("test-prompt");
      expect(ref.version).toBeUndefined();
      expect(ref.variables).toBeUndefined();
    });

    it("should accept full prompt reference", () => {
      const ref: PromptReference = {
        promptName: "test-prompt",
        version: 5,
        variables: { name: "John", age: 30 },
      };

      expect(ref.promptName).toBe("test-prompt");
      expect(ref.version).toBe(5);
      expect(ref.variables).toEqual({ name: "John", age: 30 });
    });

    it("should accept latest version string", () => {
      const ref: PromptReference = {
        promptName: "test-prompt",
        version: "latest",
      };

      expect(ref.version).toBe("latest");
    });
  });

  describe("VoltOpsClientOptions", () => {
    it("should accept minimal options", () => {
      const options: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pub_key",
        secretKey: "sec_key",
      };

      expect(options.baseUrl).toBe("https://api.voltops.com");
      expect(options.publicKey).toBe("pub_key");
      expect(options.secretKey).toBe("sec_key");
      expect(options.fetch).toBeUndefined();
    });

    it("should accept custom fetch function", () => {
      const customFetch = vi.fn();
      const options: VoltOpsClientOptions = {
        baseUrl: "https://api.voltops.com",
        publicKey: "pub_key",
        secretKey: "sec_key",
        fetch: customFetch,
      };

      expect(options.fetch).toBe(customFetch);
    });
  });

  describe("CachedPrompt", () => {
    it("should have correct structure", () => {
      const cached: CachedPrompt = {
        content: "Hello world",
        fetchedAt: Date.now(),
        ttl: 300000, // 5 minutes
      };

      expect(cached.content).toBe("Hello world");
      expect(typeof cached.fetchedAt).toBe("number");
      expect(cached.ttl).toBe(300000);
    });
  });

  describe("Type Checking", () => {
    it("should have correct PromptHelper interface", () => {
      expectTypeOf<PromptHelper>().toEqualTypeOf<{
        getPrompt: (reference: PromptReference) => Promise<string>;
      }>();
    });

    it("should have correct PromptApiClient interface", () => {
      expectTypeOf<PromptApiClient>().toEqualTypeOf<{
        fetchPrompt: (reference: PromptReference) => Promise<{ content: string }>;
      }>();
    });

    it("should have correct VoltOpsPromptManager interface", () => {
      expectTypeOf<VoltOpsPromptManager>().toEqualTypeOf<{
        getPrompt: (reference: PromptReference) => Promise<string>;
        preload: (references: PromptReference[]) => Promise<void>;
        clearCache: () => void;
        getCacheStats: () => { size: number; entries: string[] };
      }>();
    });

    it("should have correct VoltOpsClient interface", () => {
      expectTypeOf<VoltOpsClient>().toEqualTypeOf<{
        prompts: VoltOpsPromptManager;
        options: VoltOpsClientOptions;
      }>();
    });
  });
});
