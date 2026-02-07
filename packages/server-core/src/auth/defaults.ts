/**
 * Default route configurations for authentication
 */

/**
 * Routes that don't require authentication by default (legacy auth)
 */
export const DEFAULT_LEGACY_PUBLIC_ROUTES = [
  // Agent management endpoints (VoltOps uses these)
  "GET /agents", // List all agents
  "GET /agents/:id", // Get agent details

  // Workflow management endpoints
  "GET /workflows", // List all workflows
  "GET /workflows/:id", // Get workflow details

  // Tool management endpoints
  "GET /tools", // List all tools

  // API documentation
  "GET /doc", // OpenAPI spec
  "GET /ui", // Swagger UI
  "GET /", // Landing page

  // MCP (public discovery)
  "GET /mcp/servers",
  "GET /mcp/servers/:serverId",
  "GET /mcp/servers/:serverId/tools",

  // A2A (agent-to-agent discovery)
  "GET /agents/:id/card",
];

// Backward compatibility alias
export const DEFAULT_PUBLIC_ROUTES = DEFAULT_LEGACY_PUBLIC_ROUTES;

/**
 * Routes that require console access when authNext is enabled
 */
export const DEFAULT_CONSOLE_ROUTES = [
  // Agent management endpoints (VoltOps uses these)
  "GET /agents", // List all agents
  "GET /agents/:id", // Get agent details

  // Workflow management endpoints
  "GET /workflows", // List all workflows
  "GET /workflows/:id", // Get workflow details

  // Tool management endpoints
  "GET /tools", // List all tools

  // API documentation
  "GET /doc", // OpenAPI spec
  "GET /ui", // Swagger UI
  "GET /", // Landing page

  // MCP (public discovery)
  "GET /mcp/servers",
  "GET /mcp/servers/:serverId",
  "GET /mcp/servers/:serverId/tools",

  // A2A (agent-to-agent discovery)
  "GET /agents/:id/card",

  "GET /agents/:id/history",
  "GET /agents/:id/workspace",
  "GET /agents/:id/workspace/ls",
  "GET /agents/:id/workspace/read",
  "GET /agents/:id/workspace/skills",
  "GET /agents/:id/workspace/skills/:skillId",
  "GET /workflows/executions",
  "GET /workflows/:id/executions/:executionId/state",
  "GET /api/logs",
  "POST /setup-observability",
  "/observability/*",
  "GET /updates",
  "POST /updates",
  "POST /updates/:packageName",
  "WS /ws",
  "WS /ws/logs",
  "WS /ws/observability/**",
];

/**
 * Routes that require authentication by default
 * These endpoints execute operations, modify state, or access sensitive data
 */
export const PROTECTED_ROUTES = [
  // ========================================
  // AGENT EXECUTION (User Data)
  // ========================================
  "POST /agents/:id/text", // generateText
  "POST /agents/:id/stream", // streamText
  "POST /agents/:id/chat", // chatStream
  "GET /agents/:id/chat/:conversationId/stream", // resumeChatStream
  "POST /agents/:id/object", // generateObject
  "POST /agents/:id/stream-object", // streamObject
  "GET /agents/:id/workspace", // workspace info
  "GET /agents/:id/workspace/ls", // workspace list files
  "GET /agents/:id/workspace/read", // workspace read file
  "GET /agents/:id/workspace/skills", // workspace list skills
  "GET /agents/:id/workspace/skills/:skillId", // workspace skill
  "WS /ws/agents/:id", // WebSocket connection

  // ========================================
  // TOOL EXECUTION (User Data)
  // ========================================
  "POST /tools/:name/execute",

  // ========================================
  // WORKFLOW EXECUTION (User Data)
  // ========================================
  "POST /workflows/:id/run", // Run workflow
  "POST /workflows/:id/stream", // Stream workflow execution

  // ========================================
  // WORKFLOW CONTROL (State Modification)
  // ========================================
  "POST /workflows/:id/executions/:executionId/suspend", // Suspend execution
  "POST /workflows/:id/executions/:executionId/resume", // Resume execution
  "POST /workflows/:id/executions/:executionId/cancel", // Cancel execution

  // ========================================
  // MEMORY (User Data)
  // ========================================
  "/api/memory/*", // All memory endpoints (GET/POST/PATCH/DELETE)

  // ========================================
  // OBSERVABILITY (Admin/Internal Tooling)
  // Covers all observability endpoints:
  // - /observability/traces
  // - /observability/spans/:id
  // - /observability/logs
  // - /observability/memory/*
  // ========================================
  "/observability/*", // All methods (GET, POST, PUT, DELETE)

  // ========================================
  // SYSTEM UPDATES (Critical Security)
  // ========================================
  "GET /updates", // Check for updates (admin only)
  "POST /updates", // Install all updates
  "POST /updates/:packageName", // Install single package
];

/**
 * Check if a path matches a route pattern
 *
 * Supports multiple pattern types:
 * - Exact match: "/agents" matches "/agents"
 * - Parameters: "/agents/:id" matches "/agents/123"
 * - Trailing wildcard: "/observability/*" matches "/observability/traces" and "/observability/memory/users"
 * - Double-star: "/api/**" matches "/api" and all children
 *
 * @param path The actual request path (e.g., "/agents/123")
 * @param pattern The route pattern (e.g., "/agents/:id" or "/observability/*")
 * @returns True if the path matches the pattern
 *
 * @example
 * pathMatches("/observability/traces", "/observability/*") → true
 * pathMatches("/observability/memory/users", "/observability/*") → true
 * pathMatches("/api/traces", "/observability/*") → false
 */
export function pathMatches(path: string, pattern: string): boolean {
  // Remove method prefix if present (e.g., "GET /path")
  const routeParts = pattern.split(" ");
  const routePattern = routeParts.length === 2 ? routeParts[1] : pattern;

  // ========================================
  // WILDCARD SUPPORT
  // ========================================

  // Trailing wildcard: /observability/* matches /observability/anything/deep
  if (routePattern.endsWith("/*")) {
    const prefix = routePattern.slice(0, -2); // Remove '/*'
    // Must have at least one more segment after prefix
    return path.startsWith(`${prefix}/`) && path.length > prefix.length + 1;
  }

  // Double-star: /api/** matches /api and all children
  if (routePattern.includes("/**")) {
    const prefix = routePattern.replace("/**", "");
    return path === prefix || path.startsWith(`${prefix}/`);
  }

  // ========================================
  // PARAMETER & EXACT MATCHING
  // ========================================
  const patternParts = routePattern.split("/");
  const pathParts = path.split("/");

  if (patternParts.length !== pathParts.length) {
    return false;
  }

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i];
    const pathPart = pathParts[i];

    // Dynamic parameter (e.g., :id, :executionId)
    if (patternPart.startsWith(":")) {
      continue;
    }

    // Single-segment wildcard
    if (patternPart === "*") {
      continue;
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
  // Check if it's a default public route
  for (const publicRoute of DEFAULT_LEGACY_PUBLIC_ROUTES) {
    if (publicRoute.includes(" ")) {
      // Route with method specified
      const [routeMethod, routePath] = publicRoute.split(" ");
      if (method.toUpperCase() === routeMethod && pathMatches(path, routePath)) {
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
        const [routeMethod, routePath] = publicRoute.split(" ");
        if (method.toUpperCase() === routeMethod && pathMatches(path, routePath)) {
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
  const result = defaultPrivate ?? false;
  return result;
}
