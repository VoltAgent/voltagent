import { afterEach, describe, expect, it, vi } from "vitest";
import { hasConsoleAccess, isDevEnvironment, isDevRequest } from "./utils";

describe("auth utils", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("isDevEnvironment", () => {
    it("returns true for development", () => {
      vi.stubEnv("NODE_ENV", "development");
      expect(isDevEnvironment()).toBe(true);
    });

    it("returns true for test", () => {
      vi.stubEnv("NODE_ENV", "test");
      expect(isDevEnvironment()).toBe(true);
    });

    it("returns false for production", () => {
      vi.stubEnv("NODE_ENV", "production");
      expect(isDevEnvironment()).toBe(false);
    });

    it("returns false for empty string (fail-closed)", () => {
      vi.stubEnv("NODE_ENV", "");
      expect(isDevEnvironment()).toBe(false);
    });

    it("returns false when NODE_ENV is undefined (fail-closed)", () => {
      vi.stubEnv("NODE_ENV", undefined as unknown as string);
      expect(isDevEnvironment()).toBe(false);
    });
  });

  describe("isDevRequest", () => {
    it("accepts the dev header in non-production", () => {
      vi.stubEnv("NODE_ENV", "development");

      const req = new Request("http://localhost/api", {
        headers: { "x-voltagent-dev": "true" },
      });

      expect(isDevRequest(req)).toBe(true);
    });

    it("accepts the dev query param for websocket-style requests in non-production", () => {
      vi.stubEnv("NODE_ENV", "development");

      const req = new Request("http://localhost/ws?dev=true");

      expect(isDevRequest(req)).toBe(true);
    });

    it("rejects the dev header when NODE_ENV is empty (fail-closed)", () => {
      vi.stubEnv("NODE_ENV", "");

      const req = new Request("http://localhost/api", {
        headers: { "x-voltagent-dev": "true" },
      });

      expect(isDevRequest(req)).toBe(false);
    });

    it("rejects the dev query param when NODE_ENV is empty", () => {
      vi.stubEnv("NODE_ENV", "");

      const req = new Request("http://localhost/ws?dev=true");

      expect(isDevRequest(req)).toBe(false);
    });

    it("rejects the dev header when NODE_ENV is undefined (fail-closed)", () => {
      vi.stubEnv("NODE_ENV", undefined as unknown as string);

      const req = new Request("http://localhost/api", {
        headers: { "x-voltagent-dev": "true" },
      });

      expect(isDevRequest(req)).toBe(false);
    });

    it("rejects the dev query param when NODE_ENV is undefined", () => {
      vi.stubEnv("NODE_ENV", undefined as unknown as string);

      const req = new Request("http://localhost/ws?dev=true");

      expect(isDevRequest(req)).toBe(false);
    });

    it("accepts the dev header in test environment", () => {
      vi.stubEnv("NODE_ENV", "test");

      const req = new Request("http://localhost/api", {
        headers: { "x-voltagent-dev": "true" },
      });

      expect(isDevRequest(req)).toBe(true);
    });

    it("rejects the dev header in production", () => {
      vi.stubEnv("NODE_ENV", "production");

      const req = new Request("http://localhost/api", {
        headers: { "x-voltagent-dev": "true" },
      });

      expect(isDevRequest(req)).toBe(false);
    });

    it("rejects the dev query param in production", () => {
      vi.stubEnv("NODE_ENV", "production");

      const req = new Request("http://localhost/ws?dev=true");

      expect(isDevRequest(req)).toBe(false);
    });
  });

  describe("hasConsoleAccess", () => {
    it("reuses the dev query param bypass for websocket requests", () => {
      vi.stubEnv("NODE_ENV", "development");

      const req = new Request("http://localhost/ws?dev=true");

      expect(hasConsoleAccess(req)).toBe(true);
    });

    it("still accepts a configured console access key from query params", () => {
      vi.stubEnv("NODE_ENV", "production");
      vi.stubEnv("VOLTAGENT_CONSOLE_ACCESS_KEY", "secret-key");

      const req = new Request("http://localhost/ws?key=secret-key");

      expect(hasConsoleAccess(req)).toBe(true);
    });
  });
});
