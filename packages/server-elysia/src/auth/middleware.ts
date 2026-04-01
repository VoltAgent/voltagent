import type { AuthNextConfig, AuthProvider } from "@voltagent/server-core";
import {
  hasConsoleAccess,
  isDevRequest,
  normalizeAuthNextConfig,
  requiresAuth,
  resolveAuthNextAccess,
} from "@voltagent/server-core";
import type { Context } from "elysia";

/**
 * Create authentication middleware for Elysia
 * This middleware handles both authentication and user context injection
 * @param authProvider The authentication provider
 * @returns Elysia middleware function
 */
export function createAuthMiddleware(authProvider: AuthProvider<Request>) {
  return async ({ request, path, set, store }: Context & { store: any }) => {
    const method = request.method;

    // Check if this route requires authentication
    const needsAuth = requiresAuth(
      method,
      path,
      authProvider.publicRoutes,
      authProvider.defaultPrivate,
    );

    if (!needsAuth) {
      // Public route, no auth needed
      return;
    }

    // Console Access Check (for observability and system routes)
    if (path.startsWith("/observability/") || path.startsWith("/updates")) {
      if (hasConsoleAccess(request)) {
        return;
      }
    }

    // Development bypass: Allow requests with x-voltagent-dev header in development
    const devBypass = isDevRequest(request);

    if (devBypass) {
      return;
    }

    try {
      // Extract token
      let token: string | undefined;

      if (authProvider.extractToken) {
        // Use provider's custom extraction
        token = authProvider.extractToken(request);
      } else {
        // Default extraction from Authorization header
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        set.status = 401;
        return {
          success: false,
          error: "Authentication required",
        };
      }

      // Verify token and get user
      const user = await authProvider.verifyToken(token, request);

      if (!user) {
        set.status = 401;
        return {
          success: false,
          error: "Invalid authentication",
        };
      }

      // Store user in store for route handlers to access
      store.authenticatedUser = user;

      // Also inject user context into request body for agent/workflow execution
      injectUserContext(request, user);

      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      set.status = 401;
      return {
        success: false,
        error: message,
      };
    }
  };
}

/**
 * Create authentication middleware for Elysia using authNext policy
 * This middleware handles both authentication and user context injection
 * @param authNextConfig The authNext configuration
 * @returns Elysia middleware function
 */
export function createAuthNextMiddleware(
  authNextConfig: AuthNextConfig<Request> | AuthProvider<Request>,
) {
  const config = normalizeAuthNextConfig(authNextConfig);
  const authProvider = config.provider;

  return async ({ request, path, set, store }: Context & { store: any }) => {
    const method = request.method;
    const access = resolveAuthNextAccess(method, path, config);

    if (access === "public") {
      return;
    }

    if (access === "console") {
      if (hasConsoleAccess(request)) {
        return;
      }

      set.status = 401;
      return {
        success: false,
        error: buildAuthNextMessage("console", "Console access required"),
      };
    }

    if (isDevRequest(request)) {
      return;
    }

    try {
      let token: string | undefined;

      if (authProvider.extractToken) {
        token = authProvider.extractToken(request);
      } else {
        const authHeader = request.headers.get("Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        set.status = 401;
        return {
          success: false,
          error: buildAuthNextMessage("user", "Authentication required"),
        };
      }

      const user = await authProvider.verifyToken(token, request);

      if (!user) {
        set.status = 401;
        return {
          success: false,
          error: buildAuthNextMessage("user", "Invalid authentication"),
        };
      }

      // Store user in store for route handlers to access
      store.authenticatedUser = user;

      // Also inject user context into request body for agent/workflow execution
      injectUserContext(request, user);

      return;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Authentication failed";
      set.status = 401;
      return {
        success: false,
        error: buildAuthNextMessage("user", reason),
      };
    }
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

/**
 * Inject user context into the request for agent/workflow execution
 */
function injectUserContext(request: Request, user: any) {
  // Store original json method
  const originalJson = (request as any).json?.bind(request);

  if (!originalJson) {
    return;
  }

  let cachedBody: any;
  let isCached = false;

  // Override json method to inject user context
  (request as any).json = async () => {
    if (isCached) {
      return cachedBody;
    }

    const body = await originalJson();

    if (!body || typeof body !== "object") {
      cachedBody = body;
      isCached = true;
      return body;
    }

    // Create a proper merged context
    const userId = user.id || user.sub || body.options?.userId;

    // Merge body.context into body.options.context
    const mergedContext = {
      ...body.context,
      ...body.options?.context,
      user,
    };

    cachedBody = {
      ...body,
      options: {
        ...body.options,
        userId,
        context: mergedContext,
      },
    };

    isCached = true;
    return cachedBody;
  };
}
