import { afterEach, describe, expect, it, vi } from "vitest";
import { hasConsoleAccess, isDevRequest } from "./utils";

describe("auth utils", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
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
