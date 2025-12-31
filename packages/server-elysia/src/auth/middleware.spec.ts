import type { AuthProvider } from "@voltagent/server-core";
import { Elysia } from "elysia";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthMiddleware } from "./middleware";

describe("Auth Middleware - conversationId & Options Preservation", () => {
  let mockAuthProvider: AuthProvider;

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock AuthProvider
    mockAuthProvider = {
      type: "custom",
      verifyToken: vi.fn(async (token: string) => {
        if (token === "valid-token") {
          return { id: "user-123", name: "Test User" };
        }
        return null;
      }),
      extractToken: vi.fn((request: any) => {
        const authHeader = request.headers?.get?.("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          return authHeader.substring(7);
        }
        return undefined;
      }),
      publicRoutes: ["GET /health"],
      defaultPrivate: false,
    };
  });

  describe("conversationId Preservation (Main Fix)", () => {
    it("should preserve conversationId from body.options when adding user context", async () => {
      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Hello",
            options: {
              conversationId: "conv-abc-123",
              temperature: 0.7,
            },
          }),
        }),
      );

      const body = await res.json();

      // Verify conversationId is preserved
      expect(body.options.conversationId).toBe("conv-abc-123");

      // Verify user context is added
      expect(body.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });

      // Verify temperature is preserved
      expect(body.options.temperature).toBe(0.7);
    });

    it("should preserve conversationId even when body.context has other data", async () => {
      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Hello",
            context: {
              customKey: "customValue",
            },
            options: {
              conversationId: "conv-xyz-789",
            },
          }),
        }),
      );

      const body = await res.json();

      expect(body.options.conversationId).toBe("conv-xyz-789");
      expect(body.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });
      expect(body.options.context.customKey).toBe("customValue");
    });
  });

  describe("Multiple Options Preservation", () => {
    it("should preserve all options (conversationId, temperature, maxSteps, etc.)", async () => {
      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Test input",
            options: {
              conversationId: "conv-multi-123",
              temperature: 0.8,
              maxSteps: 10,
              topP: 0.9,
              maxOutputTokens: 1000,
            },
          }),
        }),
      );

      const body = await res.json();

      // All options should be preserved
      expect(body.options.conversationId).toBe("conv-multi-123");
      expect(body.options.temperature).toBe(0.8);
      expect(body.options.maxSteps).toBe(10);
      expect(body.options.topP).toBe(0.9);
      expect(body.options.maxOutputTokens).toBe(1000);

      // User context should be added
      expect(body.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });
    });
  });

  describe("Context Merging", () => {
    it("should merge user context with existing body.options.context", async () => {
      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Test",
            options: {
              conversationId: "conv-merge-123",
              context: {
                sessionId: "session-456",
                deviceType: "mobile",
              },
            },
          }),
        }),
      );

      const body = await res.json();

      // Original context should be preserved
      expect(body.options.context.sessionId).toBe("session-456");
      expect(body.options.context.deviceType).toBe("mobile");

      // User should be added
      expect(body.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });

      // conversationId should still be there
      expect(body.options.conversationId).toBe("conv-merge-123");
    });

    it("should merge body.context into body.options.context", async () => {
      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Test",
            context: {
              rootLevelContext: "rootValue",
            },
            options: {
              conversationId: "conv-root-123",
              context: {
                optionLevelContext: "optionValue",
              },
            },
          }),
        }),
      );

      const body = await res.json();

      // Both contexts should be merged
      expect(body.options.context.rootLevelContext).toBe("rootValue");
      expect(body.options.context.optionLevelContext).toBe("optionValue");
      expect(body.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });
    });
  });

  describe("userId Priority Logic", () => {
    it("should use user.id when available", async () => {
      mockAuthProvider.verifyToken = vi.fn(async () => ({
        id: "user-from-id",
        sub: "user-from-sub",
      }));

      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Test",
            options: {
              conversationId: "conv-123",
            },
          }),
        }),
      );

      const body = await res.json();
      expect(body.options.userId).toBe("user-from-id");
    });

    it("should use user.sub when user.id is not available", async () => {
      mockAuthProvider.verifyToken = vi.fn(async () => ({
        sub: "user-from-sub-only",
        name: "Test User",
      }));

      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Test",
            options: {
              conversationId: "conv-123",
            },
          }),
        }),
      );

      const body = await res.json();
      expect(body.options.userId).toBe("user-from-sub-only");
    });

    it("should fallback to body.options.userId if user has neither id nor sub", async () => {
      mockAuthProvider.verifyToken = vi.fn(async () => ({
        name: "Test User",
        email: "test@example.com",
      }));

      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Test",
            options: {
              conversationId: "conv-123",
              userId: "existing-user-id",
            },
          }),
        }),
      );

      const body = await res.json();
      expect(body.options.userId).toBe("existing-user-id");
    });
  });

  describe("Empty Options Handling", () => {
    it("should create options object when body.options is undefined", async () => {
      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", async ({ request }: any) => {
          const body = await request.json();
          return body;
        });

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer valid-token",
          },
          body: JSON.stringify({
            input: "Test without options",
          }),
        }),
      );

      const body = await res.json();

      expect(body.options).toBeDefined();
      expect(body.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });
      expect(body.options.userId).toBe("user-123");
    });
  });

  describe("Public Routes", () => {
    it("should not modify body for public routes", async () => {
      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .get("/health", () => ({ status: "ok" }));

      const res = await app.handle(new Request("http://localhost:3000/health"));

      expect(res.status).toBe(200);
      // verifyToken should not be called for public routes
      expect(mockAuthProvider.verifyToken).not.toHaveBeenCalled();
    });
  });

  describe("Authentication Failures", () => {
    it("should return 401 when token is missing", async () => {
      mockAuthProvider.defaultPrivate = true;

      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", () => ({ success: true }));

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ input: "Test" }),
        }),
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authentication required");
    });

    it("should return 401 when token is invalid", async () => {
      mockAuthProvider.defaultPrivate = true;

      const app = new Elysia()
        .state("authenticatedUser", null as any)
        .onBeforeHandle(createAuthMiddleware(mockAuthProvider))
        .post("/agents/test-agent/text", () => ({ success: true }));

      const res = await app.handle(
        new Request("http://localhost:3000/agents/test-agent/text", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer invalid-token",
          },
          body: JSON.stringify({ input: "Test" }),
        }),
      );

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid authentication");
    });
  });
});
