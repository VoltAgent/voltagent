/**
 * Default route configurations for authentication
 */

/**
 * Routes that don't require authentication by default
 * These are typically used by VoltOps and management tools
 */
export const DEFAULT_PUBLIC_ROUTES = [
  // Agent management endpoints (VoltOps uses these)
  "GET /agents", // List all agents
  "GET /agents/:id", // Get agent details

  // Workflow management endpoints
  "GET /workflows", // List all workflows
  "GET /workflows/:id", // Get workflow details

  // Logs and monitoring
  "GET /logs", // Get logs
  "GET /logs/stream", // Stream logs (WebSocket)

  // API documentation
  "GET /doc", // OpenAPI spec
  "GET /ui", // Swagger UI
  "GET /", // Landing page

  // Health checks
  "GET /health", // Health check endpoint
];

/**
 * Routes that require authentication by default
 * These are the actual execution endpoints
 */
export const PROTECTED_ROUTES = [
  // Agent execution endpoints
  "POST /agents/:id/text", // generateText
  "POST /agents/:id/stream", // streamText
  "POST /agents/:id/chat", // chatStream
  "POST /agents/:id/object", // generateObject
  "POST /agents/:id/stream-object", // streamObject

  // Workflow execution endpoints
  "POST /workflows/:id/run", // Run workflow
  "POST /workflows/:id/stream", // Stream workflow execution
  "POST /workflows/:id/suspend", // Suspend workflow
  "POST /workflows/:id/resume", // Resume workflow

  // WebSocket connections for agents
  "WS /ws/agents/:id", // Agent WebSocket connection
];

/**
 * Check if a path matches a route pattern
 * @param path The actual request path (e.g., "/agents/123")
 * @param pattern The route pattern (e.g., "/agents/:id")
 * @returns True if the path matches the pattern
 */
export function pathMatches(path: string, pattern: string): boolean {
  // Remove method prefix if present
  const routeParts = pattern.split(" ");
  const routePattern = routeParts.length === 2 ? routeParts[1] : pattern;

  // Simple pattern matching for parameters
  const patternParts = routePattern.split("/");
  const pathParts = path.split("/");

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    // Skip parameter parts (e.g., :id)
    if (patternPart.startsWith(":")) {
      continue;
    }

    // Wildcard matching
    if (patternPart === "*") {
      return true;
    }

    // Exact match required
    if (patternPart !== pathPart) {
      return false;
    }
  }

  return true;
}

/**
 * Check if a route requires authentication
 * @param method The HTTP method
 * @param path The request path
 * @param publicRoutes Additional public routes from config
 * @param defaultPrivate When true, routes require auth by default (opt-out model)
 * @returns True if the route requires authentication
 */
export function requiresAuth(
  method: string,
  path: string,
  publicRoutes?: string[],
  defaultPrivate?: boolean,
): boolean {
  const fullRoute = `${method.toUpperCase()} ${path}`;

  // Check if it's a default public route
  for (const publicRoute of DEFAULT_PUBLIC_ROUTES) {
    if (publicRoute.includes(" ")) {
      // Route with method specified
      if (fullRoute === publicRoute || pathMatches(path, publicRoute)) {
        return false; // Public route, no auth required
      }
    } else {
      // Route without method (any method)
      if (pathMatches(path, publicRoute)) {
        return false; // Public route, no auth required
      }
    }
  }

  // Check additional public routes from config
  if (publicRoutes) {
    for (const publicRoute of publicRoutes) {
      if (publicRoute.includes(" ")) {
        // Route with method specified
        if (fullRoute === publicRoute || pathMatches(path, publicRoute)) {
          return false; // Public route, no auth required
        }
      } else {
        // Route without method (any method)
        if (pathMatches(path, publicRoute)) {
          return false; // Public route, no auth required
        }
      }
    }
  }

  // Check if it's a protected route
  for (const protectedRoute of PROTECTED_ROUTES) {
    if (protectedRoute.includes(" ")) {
      // Route with method specified
      const [routeMethod, routePath] = protectedRoute.split(" ");
      if (method.toUpperCase() === routeMethod && pathMatches(path, routePath)) {
        return true; // Protected route, auth required
      }
    } else {
      // Route without method (any method)
      if (pathMatches(path, protectedRoute)) {
        return true; // Protected route, auth required
      }
    }
  }

  // Default: Use defaultPrivate to determine behavior for unknown routes
  // When defaultPrivate is true, all routes require auth unless explicitly made public
  // When defaultPrivate is false/undefined, custom endpoints work without auth (current behavior)
  return defaultPrivate ?? false;
}
