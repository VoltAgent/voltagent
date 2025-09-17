/**
 * Hono-specific authentication implementations
 */

// Re-export JWT auth from server-core
export { jwtAuth, createJWT, type JWTAuthOptions } from "@voltagent/server-core";

// Export Hono-specific middleware
export { createAuthMiddleware } from "./middleware";
