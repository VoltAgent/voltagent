import type { AuthNextConfig, AuthProvider } from "@voltagent/server-core";
import {
  hasConsoleAccess,
  isDevRequest,
  normalizeAuthNextConfig,
  requiresAuth,
  resolveAuthNextAccess,
} from "@voltagent/server-core";
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

      injectUserContext(c, user);

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

/**
 * Create authentication middleware for Hono using authNext policy
 * This middleware handles both authentication and user context injection
 * @param authNextConfig The authNext configuration
 * @returns Hono middleware function
 */
export function createAuthNextMiddleware(
  authNextConfig: AuthNextConfig<Request> | AuthProvider<Request>,
) {
  const config = normalizeAuthNextConfig(authNextConfig);
  const authProvider = config.provider;

  return async (c: Context, next: Next) => {
    const path = c.req.path;
    const method = c.req.method;
    const access = resolveAuthNextAccess(method, path, config);

    if (access === "public") {
      return next();
    }

    if (access === "console") {
      if (hasConsoleAccess(c.req.raw)) {
        return next();
      }

      return c.json(
        {
          success: false,
          error: buildAuthNextMessage("console", "Console access required"),
        },
        401,
      );
    }

    if (isDevRequest(c.req.raw)) {
      return next();
    }

    try {
      let token: string | undefined;

      if (authProvider.extractToken) {
        token = authProvider.extractToken(c.req.raw);
      } else {
        const authHeader = c.req.header("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return c.json(
          {
            success: false,
            error: buildAuthNextMessage("user", "Authentication required"),
          },
          401,
        );
      }

      const user = await authProvider.verifyToken(token, c.req.raw);

      if (!user) {
        return c.json(
          {
            success: false,
            error: buildAuthNextMessage("user", "Invalid authentication"),
          },
          401,
        );
      }

      injectUserContext(c, user);
      return next();
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Authentication failed";
      return c.json(
        {
          success: false,
          error: buildAuthNextMessage("user", reason),
        },
        401,
      );
    }
  };
}

function injectUserContext(c: Context, user: any) {
  c.set("authenticatedUser", user);

  const originalJson = c.req.json.bind(c.req);
  c.req.json = async () => {
    const body = await originalJson();
    return {
      ...body,
      context: {
        ...body.context,
        user,
      },
      ...(user.id && { userId: user.id }),
      ...(user.sub && !user.id && { userId: user.sub }),
      options: {
        ...body.options,
        context: {
          ...body.options?.context,
          ...body.context,
          user,
        },
        ...(user.id && { userId: user.id }),
        ...(user.sub && !user.id && { userId: user.sub }),
      },
    };
  };
}

function buildAuthNextMessage(access: "console" | "user", reason: string): string {
  const hint = buildAuthNextHint(access);
  const normalized = reason.endsWith(".") ? reason.slice(0, -1) : reason;
  return `${normalized}. ${hint}`;
}

function buildAuthNextHint(access: "console" | "user"): string {
  const devHint =
    process.env.NODE_ENV !== "production"
      ? " In development, you can set x-voltagent-dev: true."
      : "";

  if (access === "console") {
    return `Set VOLTAGENT_CONSOLE_ACCESS_KEY and send x-console-access-key header or add ?key=YOUR_KEY query param.${devHint}`;
  }

  return `Send Authorization: Bearer <token>.${devHint}`;
}
