/**
 * Hono-specific authentication implementations
 */

// Re-export auth utilities from server-core
export {
  createJWT,
  DEFAULT_CONSOLE_ROUTES,
  jwtAuth,
  type AuthNextConfig,
  type JWTAuthOptions,
} from "@voltagent/server-core";

// Export Hono-specific middleware
export { createAuthMiddleware, createAuthNextMiddleware } from "./middleware";
