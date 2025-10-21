/**
 * Framework-agnostic authentication middleware factory
 */

import { requiresAuth } from "./defaults";
import type { AuthProvider } from "./types";

/**
 * Framework adapter for authentication middleware
 * Each framework implements this interface to bridge framework-specific APIs
 */
export interface AuthFrameworkAdapter<TRequest, TResponse> {
  /**
   * Get the request path
   */
  getPath(req: TRequest): string;

  /**
   * Get the request method
   */
  getMethod(req: TRequest): string;

  /**
   * Get a request header
   */
  getHeader(req: TRequest, name: string): string | undefined;

  /**
   * Get the raw request object (for providers that need it)
   */
  getRawRequest(req: TRequest): Request;

  /**
   * Get the request body
   */
  getBody(req: TRequest): Promise<any>;

  /**
   * Set authenticated user in the context
   */
  setUser(context: any, user: any): void;

  /**
   * Modify request body to include user context
   */
  injectUserIntoBody(req: TRequest, user: any): void;

  /**
   * Send an error response
   */
  sendError(res: TResponse, message: string, status: number): any;

  /**
   * Send success to next middleware
   */
  next(): any;
}

/**
 * Create authentication middleware with framework adapter
 * @param authProvider The authentication provider
 * @param adapter Framework-specific adapter
 * @returns Middleware function for the framework
 */
export function createAuthMiddlewareFactory<TRequest, TResponse>(
  authProvider: AuthProvider<Request>,
  adapter: AuthFrameworkAdapter<TRequest, TResponse>,
) {
  return async (req: TRequest, res: TResponse, next?: () => any): Promise<any> => {
    const path = adapter.getPath(req);
    const method = adapter.getMethod(req);

    // Check if this route requires authentication
    if (!requiresAuth(method, path, authProvider.publicRoutes, authProvider.defaultPrivate)) {
      // Public route, no auth needed
      return next ? next() : adapter.next();
    }

    try {
      // Extract token
      let token: string | undefined;

      if (authProvider.extractToken) {
        // Use provider's custom extraction
        token = authProvider.extractToken(adapter.getRawRequest(req));
      } else {
        // Default extraction from Authorization header
        const authHeader = adapter.getHeader(req, "Authorization");
        if (authHeader?.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return adapter.sendError(res, "Authentication required", 401);
      }

      // Verify token and get user
      const user = await authProvider.verifyToken(token, adapter.getRawRequest(req));

      if (!user) {
        return adapter.sendError(res, "Invalid authentication", 401);
      }

      // Store user in context
      adapter.setUser(req, user);

      // Inject user into request body
      adapter.injectUserIntoBody(req, user);

      return next ? next() : adapter.next();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Authentication failed";
      return adapter.sendError(res, message, 401);
    }
  };
}
