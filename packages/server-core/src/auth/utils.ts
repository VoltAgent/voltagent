/**
 * Auth utility functions that can be reused across different server implementations
 */

/**
 * Extract Bearer token from Authorization header
 * @param authHeader The Authorization header value
 * @returns The token if found, undefined otherwise
 */
export function extractBearerToken(authHeader: string | undefined | null): string | undefined {
  if (!authHeader || typeof authHeader !== "string") {
    return undefined;
  }

  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  return undefined;
}

/**
 * Extract token from various sources
 * @param headers Headers object or map
 * @param cookies Optional cookies object
 * @param query Optional query parameters
 * @returns The token if found, undefined otherwise
 */
export function extractToken(
  headers: Record<string, string | string[] | undefined> | Headers,
  cookies?: Record<string, string>,
  query?: Record<string, string | string[] | undefined>,
): string | undefined {
  // Try Authorization header first
  let authHeader: string | undefined;

  if (headers instanceof Headers) {
    authHeader = headers.get("authorization") || headers.get("Authorization") || undefined;
  } else {
    authHeader =
      headers.authorization ||
      headers.Authorization ||
      (Array.isArray(headers.authorization) ? headers.authorization[0] : undefined) ||
      (Array.isArray(headers.Authorization) ? headers.Authorization[0] : undefined);
  }

  const bearerToken = extractBearerToken(authHeader);
  if (bearerToken) {
    return bearerToken;
  }

  // Try cookie
  if (cookies?.token) {
    return cookies.token;
  }

  // Try query parameter
  if (query?.token) {
    return Array.isArray(query.token) ? query.token[0] : query.token;
  }

  return undefined;
}

/**
 * Create user context object for injection into requests
 * @param user The authenticated user object
 * @param existingContext Optional existing context to merge with
 * @returns The user context object
 */
export function createUserContext(
  user: any,
  existingContext?: Record<string, any>,
): Record<string, any> {
  const context: Record<string, any> = {
    ...existingContext,
    user,
  };

  // Add userId at root level if available
  if (user.id) {
    context.userId = user.id;
  } else if (user.sub) {
    context.userId = user.sub;
  }

  return context;
}

/**
 * Inject user context into request body
 * @param body The original request body
 * @param user The authenticated user
 * @returns The modified body with user context
 */
export function injectUserIntoBody(body: any, user: any): any {
  if (!body || typeof body !== "object") {
    return {
      context: { user },
      userId: user.id || user.sub,
    };
  }

  return {
    ...body,
    context: {
      ...body.context,
      user,
    },
    // Set userId if available and not already set
    ...(user.id && !body.userId && { userId: user.id }),
    ...(user.sub && !user.id && !body.userId && { userId: user.sub }),
  };
}

/**
 * Create a standardized auth error response
 * @param message The error message
 * @param statusCode The HTTP status code
 * @returns The error response object
 */
export function createAuthErrorResponse(
  message: string,
  statusCode = 401,
): { success: false; error: string; statusCode: number } {
  return {
    success: false,
    error: message,
    statusCode,
  };
}
