/**
 * Authentication module exports
 * Framework-agnostic auth utilities
 */

export * from "./types";
export * from "./defaults";
export * from "./middleware-factory";

// Export auth providers
export { jwtAuth, createJWT } from "./providers/jwt";
export type { JWTAuthOptions } from "./providers/jwt";
