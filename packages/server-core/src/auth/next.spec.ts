import { describe, expect, it } from "vitest";
import { resolveAuthNextAccess } from "./next";
import type { AuthProvider } from "./types";

const mockProvider: AuthProvider = {
  type: "jwt",
  verifyToken: async () => ({ id: "user-1" }),
  publicRoutes: ["GET /provider-public"],
};

describe("resolveAuthNextAccess", () => {
  it("treats explicit publicRoutes as public", () => {
    const config = { provider: mockProvider, publicRoutes: ["GET /health"] };
    expect(resolveAuthNextAccess("GET", "/health", config)).toBe("public");
  });

  it("treats provider publicRoutes as public", () => {
    const config = { provider: mockProvider };
    expect(resolveAuthNextAccess("GET", "/provider-public", config)).toBe("public");
  });

  it("treats default console routes as console", () => {
    const config = { provider: mockProvider };
    expect(resolveAuthNextAccess("GET", "/agents", config)).toBe("console");
  });

  it("treats non-console routes as user", () => {
    const config = { provider: mockProvider };
    expect(resolveAuthNextAccess("POST", "/agents/test-agent/text", config)).toBe("user");
  });

  it("treats websocket test connection as console", () => {
    const config = { provider: mockProvider };
    expect(resolveAuthNextAccess("WS", "/ws", config)).toBe("console");
  });

  it("allows publicRoutes to override console routes", () => {
    const config = { provider: mockProvider, publicRoutes: ["GET /agents"] };
    expect(resolveAuthNextAccess("GET", "/agents", config)).toBe("public");
  });

  it("uses custom consoleRoutes when provided", () => {
    const config = { provider: mockProvider, consoleRoutes: ["GET /custom-console"] };
    expect(resolveAuthNextAccess("GET", "/custom-console", config)).toBe("console");
    expect(resolveAuthNextAccess("GET", "/agents", config)).toBe("user");
  });
});
