import { vi, describe, expect, it, expectTypeOf } from "vitest";
import type {
  PromptReference,
  PromptHelper,
  VoltOpsClientOptions,
  CachedPrompt,
  PromptApiClient,
  VoltOpsPromptManager,
  VoltOpsClient,
  PromptContent,
  PromptApiResponse,
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

    it("should accept version number", () => {
      const ref: PromptReference = {
        promptName: "test-prompt",
        version: 1,
      };

      expect(ref.version).toBe(1);
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
        getPrompt: (reference: PromptReference) => Promise<PromptContent>;
      }>();
    });

    it("should have correct PromptApiClient interface", () => {
      expectTypeOf<PromptApiClient>().toEqualTypeOf<{
        fetchPrompt: (reference: PromptReference) => Promise<PromptApiResponse>;
      }>();
    });

    it("should have correct VoltOpsPromptManager interface", () => {
      expectTypeOf<VoltOpsPromptManager>().toEqualTypeOf<{
        getPrompt: (reference: PromptReference) => Promise<PromptContent>;
        preload: (references: PromptReference[]) => Promise<void>;
        clearCache: () => void;
        getCacheStats: () => { size: number; entries: string[] };
      }>();
    });

    it("should have correct VoltOpsClient interface", () => {
      expectTypeOf<VoltOpsClient>().toMatchTypeOf<{
        prompts?: VoltOpsPromptManager;
        options: VoltOpsClientOptions;
      }>();
    });

    it("should have correct PromptReference interface with per-prompt cache", () => {
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

    it("should allow creating PromptReference with per-prompt cache configuration", () => {
      const reference: PromptReference = {
        promptName: "test-prompt",
        variables: { name: "world" },
        promptCache: {
          enabled: true,
          ttl: 300,
        },
      };

      expectTypeOf(reference.promptCache?.enabled).toEqualTypeOf<boolean | undefined>();
      expectTypeOf(reference.promptCache?.ttl).toEqualTypeOf<number | undefined>();
      expectTypeOf(reference.promptCache?.maxSize).toEqualTypeOf<number | undefined>();
    });

    it("should allow partial per-prompt cache configuration", () => {
      const minimalReference: PromptReference = {
        promptName: "test",
        promptCache: {
          enabled: false,
          // ttl and maxSize are optional
        },
      };

      const ttlOnlyReference: PromptReference = {
        promptName: "test",
        promptCache: {
          ttl: 120,
          // enabled and maxSize are optional
        },
      };

      expectTypeOf(minimalReference).toMatchTypeOf<PromptReference>();
      expectTypeOf(ttlOnlyReference).toMatchTypeOf<PromptReference>();
    });
  });
});
