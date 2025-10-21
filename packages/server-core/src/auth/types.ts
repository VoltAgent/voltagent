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
   * When true, all routes require authentication by default (opt-out model)
   * When false or undefined, only routes in PROTECTED_ROUTES require auth (opt-in model)
   *
   * Use this when you want to protect all routes by default and selectively
   * make certain routes public using the publicRoutes property.
   *
   * @default false
   * @example
   * ```typescript
   * // Protect all routes except those in publicRoutes
   * const authProvider: AuthProvider = {
   *   type: 'clerk',
   *   defaultPrivate: true,
   *   publicRoutes: ['GET /health', 'POST /webhooks'],
   *   verifyToken: async (token) => { ... }
   * }
   * ```
   */
  defaultPrivate?: boolean;
}
