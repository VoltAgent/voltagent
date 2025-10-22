import type { AuthProvider } from "@voltagent/server-core";
import type { Context, Next } from "hono";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAuthMiddleware } from "./middleware";

describe("Auth Middleware - conversationId & Options Preservation", () => {
  let mockAuthProvider: AuthProvider;
  let mockContext: Partial<Context>;
  let mockNext: Next;
  let capturedBody: any;

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

    // Mock Next function
    mockNext = vi.fn(async () => new Response("OK"));

    // Reset captured body
    capturedBody = null;
  });

  const createMockContext = (
    path: string,
    method: string,
    body: any,
    token?: string,
  ): Partial<Context> => {
    const headers = new Headers();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const originalJsonFn = vi.fn(async () => body);

    return {
      req: {
        path,
        method,
        header: (name: string) => headers.get(name),
        raw: { headers } as Request,
        json: originalJsonFn,
      } as any,
      set: vi.fn(),
      json: vi.fn((data: any, status?: number) => {
        return new Response(JSON.stringify(data), {
          status: status || 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    };
  };

  describe("conversationId Preservation (Main Fix)", () => {
    it("should preserve conversationId from body.options when adding user context", async () => {
      const originalBody = {
        input: "Hello",
        options: {
          conversationId: "conv-abc-123",
          temperature: 0.7,
        },
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      // After middleware runs, the json function should be replaced
      // Call it to get the transformed body
      capturedBody = await mockContext.req?.json();

      // Verify conversationId is preserved
      expect(capturedBody.options.conversationId).toBe("conv-abc-123");

      // Verify user context is added
      expect(capturedBody.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });

      // Verify temperature is preserved
      expect(capturedBody.options.temperature).toBe(0.7);
    });

    it("should preserve conversationId even when body.context has other data", async () => {
      const originalBody = {
        input: "Hello",
        context: {
          customKey: "customValue",
        },
        options: {
          conversationId: "conv-xyz-789",
        },
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      capturedBody = await mockContext.req?.json();

      expect(capturedBody.options.conversationId).toBe("conv-xyz-789");
      expect(capturedBody.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });
      expect(capturedBody.options.context.customKey).toBe("customValue");
    });
  });

  describe("Multiple Options Preservation", () => {
    it("should preserve all options (conversationId, temperature, maxSteps, etc.)", async () => {
      const originalBody = {
        input: "Test input",
        options: {
          conversationId: "conv-multi-123",
          temperature: 0.8,
          maxSteps: 10,
          topP: 0.9,
          maxOutputTokens: 1000,
        },
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      capturedBody = await mockContext.req?.json();

      // All options should be preserved
      expect(capturedBody.options.conversationId).toBe("conv-multi-123");
      expect(capturedBody.options.temperature).toBe(0.8);
      expect(capturedBody.options.maxSteps).toBe(10);
      expect(capturedBody.options.topP).toBe(0.9);
      expect(capturedBody.options.maxOutputTokens).toBe(1000);

      // User context should be added
      expect(capturedBody.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });
    });
  });

  describe("Context Merging", () => {
    it("should merge user context with existing body.options.context", async () => {
      const originalBody = {
        input: "Test",
        options: {
          conversationId: "conv-merge-123",
          context: {
            sessionId: "session-456",
            deviceType: "mobile",
          },
        },
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      capturedBody = await mockContext.req?.json();

      // Original context should be preserved
      expect(capturedBody.options.context.sessionId).toBe("session-456");
      expect(capturedBody.options.context.deviceType).toBe("mobile");

      // User should be added
      expect(capturedBody.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });

      // conversationId should still be there
      expect(capturedBody.options.conversationId).toBe("conv-merge-123");
    });

    it("should merge body.context into body.options.context", async () => {
      const originalBody = {
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
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      capturedBody = await mockContext.req?.json();

      // Both contexts should be merged
      expect(capturedBody.options.context.rootLevelContext).toBe("rootValue");
      expect(capturedBody.options.context.optionLevelContext).toBe("optionValue");
      expect(capturedBody.options.context.user).toEqual({
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

      const originalBody = {
        input: "Test",
        options: {
          conversationId: "conv-123",
        },
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      capturedBody = await mockContext.req?.json();

      expect(capturedBody.options.userId).toBe("user-from-id");
    });

    it("should use user.sub when user.id is not available", async () => {
      mockAuthProvider.verifyToken = vi.fn(async () => ({
        sub: "user-from-sub-only",
        name: "Test User",
      }));

      const originalBody = {
        input: "Test",
        options: {
          conversationId: "conv-123",
        },
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      capturedBody = await mockContext.req?.json();

      expect(capturedBody.options.userId).toBe("user-from-sub-only");
    });

    it("should fallback to body.options.userId if user has neither id nor sub", async () => {
      mockAuthProvider.verifyToken = vi.fn(async () => ({
        name: "Test User",
        email: "test@example.com",
      }));

      const originalBody = {
        input: "Test",
        options: {
          conversationId: "conv-123",
          userId: "existing-user-id",
        },
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      // Store original json function and override it
      if (mockContext.req) {
        const originalJsonFn = mockContext.req.json.bind(mockContext.req);
        mockContext.req.json = async () => {
          capturedBody = await originalJsonFn();
          return capturedBody;
        };
      }

      await middleware(mockContext as Context, mockNext);
      await mockContext.req?.json();

      expect(capturedBody.options.userId).toBe("existing-user-id");
    });
  });

  describe("Empty Options Handling", () => {
    it("should create options object when body.options is undefined", async () => {
      const originalBody = {
        input: "Test without options",
      };

      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        originalBody,
        "valid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      capturedBody = await mockContext.req?.json();

      expect(capturedBody.options).toBeDefined();
      expect(capturedBody.options.context.user).toEqual({
        id: "user-123",
        name: "Test User",
      });
      expect(capturedBody.options.userId).toBe("user-123");
    });
  });

  describe("Public Routes", () => {
    it("should not modify body for public routes", async () => {
      const originalBody = {
        input: "Public endpoint",
        options: {
          conversationId: "conv-public-123",
        },
      };

      mockContext = createMockContext("/health", "GET", originalBody);

      const middleware = createAuthMiddleware(mockAuthProvider);

      await middleware(mockContext as Context, mockNext);

      // Next should be called without authentication
      expect(mockNext).toHaveBeenCalled();

      // verifyToken should not be called for public routes
      expect(mockAuthProvider.verifyToken).not.toHaveBeenCalled();
    });
  });

  describe("Authentication Failures", () => {
    it("should return 401 when token is missing", async () => {
      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        { input: "Test" },
        // No token provided
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      const response = await middleware(mockContext as Context, mockNext);

      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(401);

      const json = await response?.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Authentication required");
    });

    it("should return 401 when token is invalid", async () => {
      mockContext = createMockContext(
        "/agents/test-agent/text",
        "POST",
        { input: "Test" },
        "invalid-token",
      );

      const middleware = createAuthMiddleware(mockAuthProvider);

      const response = await middleware(mockContext as Context, mockNext);

      expect(response).toBeInstanceOf(Response);
      expect(response?.status).toBe(401);

      const json = await response?.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe("Invalid authentication");
    });
  });
});
