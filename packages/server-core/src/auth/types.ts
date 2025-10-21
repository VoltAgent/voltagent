/**
 * Authentication provider interface for VoltAgent server
 * Framework-agnostic auth types
 */

/**
 * Base authentication provider interface
 * Each server implementation (Hono, Fastify, etc.) will implement this
 */
export interface AuthProvider<TRequest = any> {
  /**
   * The type of auth provider (e.g., 'jwt', 'auth0', 'supabase')
   */
  type: string;

  /**
   * Verify the token and return the user object
   * @param token The authentication token
   * @param request Optional request object for additional context
   * @returns The verified user object
   * @throws Error if token is invalid
   */
  verifyToken(token: string, request?: TRequest): Promise<any>;

  /**
   * Extract the token from the request
   * Each framework implements this differently
   * @param request The framework-specific request object
   * @returns The extracted token or undefined
   */
  extractToken?(request: TRequest): string | undefined;

  /**
   * Additional routes that should be public (no auth required)
   * These are added to the default public routes
   */
  publicRoutes?: string[];

  /**
   * Whether the default route protection is private (default: false)
   * If true, all routes will require authentication by default (except for public routes)
   * If false, only routes that are explicitly protected will require authentication
   * These are defined in the PROTECTED_ROUTES constant
   * This is useful for cases where you want to add additional protected routes via configureApp
   */
  isPrivate?: boolean;
}
