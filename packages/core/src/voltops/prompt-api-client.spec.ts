import { vi, describe, expect, it, beforeEach, afterEach } from "vitest";
import { expectTypeOf } from "vitest";
import { VoltOpsPromptApiClient } from "./prompt-api-client";
import type { VoltOpsClientOptions, PromptReference, PromptApiClient } from "./types";

describe("VoltOpsPromptApiClient", () => {
  let client: VoltOpsPromptApiClient;
  let mockFetch: ReturnType<typeof vi.fn>;
  const mockOptions: VoltOpsClientOptions = {
    baseUrl: "https://api.voltops.com",
    publicKey: "pub_test_key",
    secretKey: "sec_test_key",
    fetch: undefined, // Will be set to mockFetch
  };

  beforeEach(() => {
    mockFetch = vi.fn();
    client = new VoltOpsPromptApiClient({
      ...mockOptions,
      fetch: mockFetch,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("constructor", () => {
    it("should create client with correct configuration", () => {
      expect(client).toBeInstanceOf(VoltOpsPromptApiClient);
    });

    it("should remove trailing slash from baseUrl", () => {
      const clientWithSlash = new VoltOpsPromptApiClient({
        ...mockOptions,
        baseUrl: "https://api.voltops.com/",
        fetch: mockFetch,
      });

      // Test by making a call and checking the URL
      const reference: PromptReference = { promptName: "test" };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ prompt: "test content" }),
      });

      clientWithSlash.fetchPrompt(reference);

      expect(mockFetch).toHaveBeenCalledWith("https://api.voltops.com/prompts/public/test", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Key": "pub_test_key",
          "X-Secret-Key": "sec_test_key",
        },
      });
    });

    it("should use global fetch if custom fetch not provided", () => {
      const globalFetch = global.fetch;
      global.fetch = vi.fn();

      try {
        const clientWithoutFetch = new VoltOpsPromptApiClient({
          baseUrl: "https://api.voltops.com",
          publicKey: "pub_test_key",
          secretKey: "sec_test_key",
        });

        expect(clientWithoutFetch).toBeInstanceOf(VoltOpsPromptApiClient);
      } finally {
        global.fetch = globalFetch;
      }
    });
  });

  describe("fetchPrompt", () => {
    it("should fetch prompt successfully", async () => {
      const reference: PromptReference = {
        promptName: "customer-support",
        version: 1,
      };

      const mockResponse = {
        prompt: "Hello {{name}}!",
        type: "text",
        name: "customer-support",
        version: 1,
      };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await client.fetchPrompt(reference);

      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.voltops.com/prompts/public/customer-support?version=1",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Public-Key": "pub_test_key",
            "X-Secret-Key": "sec_test_key",
          },
        },
      );
    });

    it("should handle specific version", async () => {
      const reference: PromptReference = {
        promptName: "customer-support",
        version: 5,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            prompt: "Version 5 content",
            type: "text",
            name: "customer-support",
            version: 5,
          }),
      });

      await client.fetchPrompt(reference);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.voltops.com/prompts/public/customer-support?version=5",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Public-Key": "pub_test_key",
            "X-Secret-Key": "sec_test_key",
          },
        },
      );
    });

    it("should URL encode prompt name", async () => {
      const reference: PromptReference = {
        promptName: "customer support/special chars",
        version: 1,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            prompt: "content",
            type: "text",
            name: "customer support/special chars",
            version: 1,
          }),
      });

      await client.fetchPrompt(reference);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.voltops.com/prompts/public/customer%20support%2Fspecial%20chars?version=1",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Public-Key": "pub_test_key",
            "X-Secret-Key": "sec_test_key",
          },
        },
      );
    });

    it("should not include version query when version not specified", async () => {
      const reference: PromptReference = {
        promptName: "test-prompt",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            prompt: "content",
            type: "text",
            name: "test-prompt",
            version: "latest",
          }),
      });

      await client.fetchPrompt(reference);

      expect(mockFetch).toHaveBeenCalledWith("https://api.voltops.com/prompts/public/test-prompt", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "X-Public-Key": "pub_test_key",
          "X-Secret-Key": "sec_test_key",
        },
      });
    });

    it("should handle label parameter", async () => {
      const reference: PromptReference = {
        promptName: "test-prompt",
        label: "production",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            prompt: "production content",
            type: "text",
            name: "test-prompt",
            version: "latest",
            labels: ["production"],
          }),
      });

      await client.fetchPrompt(reference);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.voltops.com/prompts/public/test-prompt?label=production",
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Public-Key": "pub_test_key",
            "X-Secret-Key": "sec_test_key",
          },
        },
      );
    });

    it("should handle empty response", async () => {
      const reference: PromptReference = { promptName: "empty-prompt" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}), // Empty response
      });

      const result = await client.fetchPrompt(reference);

      expect(result).toEqual({});
    });

    it("should throw error on HTTP error response", async () => {
      const reference: PromptReference = { promptName: "not-found" };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: "Not Found",
      });

      await expect(client.fetchPrompt(reference)).rejects.toThrow(
        "Failed to fetch prompt: HTTP 404: Not Found",
      );
    });

    it("should throw error on network failure", async () => {
      const reference: PromptReference = { promptName: "network-error" };

      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      await expect(client.fetchPrompt(reference)).rejects.toThrow(
        "Failed to fetch prompt: Network error",
      );
    });

    it("should throw error on JSON parse failure", async () => {
      const reference: PromptReference = { promptName: "invalid-json" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new Error("Invalid JSON")),
      });

      await expect(client.fetchPrompt(reference)).rejects.toThrow(
        "Failed to fetch prompt: Invalid JSON",
      );
    });

    it("should handle unknown error types", async () => {
      const reference: PromptReference = { promptName: "unknown-error" };

      mockFetch.mockRejectedValueOnce("Unknown error");

      await expect(client.fetchPrompt(reference)).rejects.toThrow(
        "Failed to fetch prompt: Unknown error",
      );
    });
  });

  describe("type checking", () => {
    it("should implement PromptApiClient interface", () => {
      expectTypeOf(client).toMatchTypeOf<PromptApiClient>();
    });

    it("should have correct fetchPrompt method signature", () => {
      expectTypeOf(client.fetchPrompt).parameter(0).toMatchTypeOf<PromptReference>();
    });
  });
});
