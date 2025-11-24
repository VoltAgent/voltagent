import type { AuthProvider } from "@voltagent/server-core";
import { hasConsoleAccess, isDevRequest, requiresAuth } from "@voltagent/server-core";
import type { Context, Next } from "hono";

/**
 * Create authentication middleware for Hono
 * This middleware handles both authentication and user context injection
 * @param authProvider The authentication provider
 * @returns Hono middleware function
 */
export function createAuthMiddleware(authProvider: AuthProvider<Request>) {
  return async (c: Context, next: Next) => {
    const path = c.req.path;
    const method = c.req.method;

    // Check if this route requires authentication
    const needsAuth = requiresAuth(
      method,
      path,
      authProvider.publicRoutes,
      authProvider.defaultPrivate,
    );

    if (!needsAuth) {
      // Public route, no auth needed
      return next();
    }

    // Console Access Check (for observability and system routes)
    if (path.startsWith("/observability/") || path.startsWith("/updates")) {
      if (hasConsoleAccess(c.req.raw)) {
        return next();
      }
    }

    // Development bypass: Allow requests with x-voltagent-dev header in development
    const devBypass = isDevRequest(c.req.raw);

    if (devBypass) {
      return next();
    }

    try {
      // Extract token
      let token: string | undefined;

      if (authProvider.extractToken) {
        // Use provider's custom extraction
        token = authProvider.extractToken(c.req.raw);
      } else {
        // Default extraction from Authorization header
        const authHeader = c.req.header("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return c.json(
          {
            success: false,
            error: "Authentication required",
          },
          401,
        );
      }

      // Verify token and get user
      const user = await authProvider.verifyToken(token, c.req.raw);

      if (!user) {
        return c.json(
          {
            success: false,
            error: "Invalid authentication",
          },
          401,
        );
      }

      // Store user in context for later use
      c.set("authenticatedUser", user);

      // Inject user into request body for protected routes
      // This modifies c.req.json() to include context
      const originalJson = c.req.json.bind(c.req);
      c.req.json = async () => {
        const body = await originalJson();
        return {
          ...body,
          // Not removing context from body as it might be used somewhere else
          context: {
            ...body.context,
            user,
          },
          // Set userId if available
          ...(user.id && { userId: user.id }),
          ...(user.sub && !user.id && { userId: user.sub }),
          // Adding the above in options, as this is where context is read from
          // by processAgentOptions (packages/server-core/src/utils/options.ts:37)
          // and processWorkflowOptions
          // These is needed so the auth context/user arrives into OperationContext
          options: {
            ...body.options, // Preserve all existing options (conversationId, temperature, etc.)
            context: {
              ...body.options?.context,
              ...body.context,
              user,
            },
            // Set userId if available
            ...(user.id && { userId: user.id }),
            ...(user.sub && !user.id && { userId: user.sub }),
          },
        };
      };

      return next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      return c.json(
        {
          success: false,
          error: message,
        },
        401,
      );
    }
  };
}
