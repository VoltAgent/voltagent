import jwt from "jsonwebtoken";
import type { AuthProvider } from "../types";

/**
 * JWT authentication options
 */
export interface JWTAuthOptions {
  /**
   * JWT secret for token verification
   */
  secret: string;

  /**
   * Optional function to map JWT payload to user object
   * @param payload The decoded JWT payload
   * @returns The mapped user object
   */
  mapUser?: (payload: any) => any;

  /**
   * Additional public routes (no auth required)
   */
  publicRoutes?: string[];

  /**
   * Optional JWT verification options
   */
  verifyOptions?: {
    algorithms?: jwt.Algorithm[];
    audience?: string;
    issuer?: string;
  };

  /**
   * When true, all routes require authentication by default (opt-out model)
   * @default false
   */
  defaultPrivate?: boolean;
}

/**
 * Create a JWT authentication provider
 * Framework-agnostic JWT authentication that works with any server implementation
 * @param options JWT authentication options
 * @returns AuthProvider instance for JWT authentication
 */
export function jwtAuth(options: JWTAuthOptions): AuthProvider<Request> {
  const { secret, mapUser, publicRoutes, verifyOptions } = options;

  return {
    type: "jwt",

    async verifyToken(token: string): Promise<any> {
      try {
        // Verify the JWT token
        const payload = jwt.verify(token, secret, {
          algorithms: verifyOptions?.algorithms || ["HS256"],
          audience: verifyOptions?.audience,
          issuer: verifyOptions?.issuer,
        });

        // Map the payload to user object if mapper is provided
        if (mapUser && typeof mapUser === "function") {
          return mapUser(payload);
        }

        // Return raw payload if no mapper
        return payload;
      } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
          throw new Error(`Invalid token: ${error.message}`);
        }
        if (error instanceof jwt.TokenExpiredError) {
          throw new Error("Token expired");
        }
        if (error instanceof jwt.NotBeforeError) {
          throw new Error("Token not active yet");
        }
        throw error;
      }
    },

    extractToken(req: Request): string | undefined {
      // Extract from Authorization header
      const authHeader = req.headers.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        return authHeader.substring(7);
      }

      // Could also extract from cookies or query params in the future
      return undefined;
    },

    publicRoutes,
    defaultPrivate: options.defaultPrivate,
  };
}

/**
 * Helper function to create a simple JWT token (for testing/examples)
 * @param payload The payload to encode
 * @param secret The JWT secret
 * @param options Optional JWT sign options
 * @returns The signed JWT token
 */
export function createJWT(payload: object, secret: string, options?: jwt.SignOptions): string {
  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: "24h",
    ...options,
  });
}
