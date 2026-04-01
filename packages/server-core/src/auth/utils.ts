/**
 * Authentication utility functions
 */

/**
 * Check if request is from development environment
 *
 * Requires BOTH client header AND non-production environment for security.
 * This prevents production bypass while allowing local development.
 *
 * @param req - The incoming HTTP request
 * @returns True if both dev header and non-production environment are present
 *
 * @example
 * // Local development with header (typical case)
 * NODE_ENV=undefined + x-voltagent-dev=true → true (auth bypassed)
 *
 * // Development with header (playground)
 * NODE_ENV=development + x-voltagent-dev=true → true (auth bypassed)
 *
 * // Development without header (testing auth)
 * NODE_ENV=undefined + no header → false (auth required)
 *
 * // Production with header (attacker attempt)
 * NODE_ENV=production + x-voltagent-dev=true → false (auth required)
 *
 * @security
 * - Client header alone: Cannot bypass in production
 * - Non-production env alone: Developer can still test auth
 * - Both required: Selective bypass for DX
 * - Production is strictly protected (NODE_ENV=production)
 */
export function isDevRequest(req: Request): boolean {
  const hasDevHeader = req.headers.get("x-voltagent-dev") === "true";
  // Treat undefined/empty NODE_ENV as development (only production is strict)
  const isDevEnv = process.env.NODE_ENV !== "production";

  return hasDevHeader && isDevEnv;
}

/**
 * Check if request has valid Console access
 * Works in both development and production environments
 *
 * @param req - The incoming HTTP request
 * @returns True if request has valid console access
 *
 * @example
 * // Development with dev header
 * NODE_ENV=development + x-voltagent-dev=true → true
 *
 * // Production with console key
 * NODE_ENV=production + x-console-access-key=valid-key → true
 *
 * // Production with console key in query param
 * NODE_ENV=production + ?key=valid-key → true
 *
 * // Production without key
 * NODE_ENV=production + no key → false
 *
 * @security
 * - In development: Uses existing dev bypass
 * - In production: Requires matching console access key
 * - Key must match VOLTAGENT_CONSOLE_ACCESS_KEY env var
 */
export function hasConsoleAccess(req: Request): boolean {
  // 1. Development bypass (existing system)
  if (isDevRequest(req)) {
    return true;
  }

  // 2. Console Access Key check (for production)
  const consoleKey = req.headers.get("x-console-access-key");
  const url = new URL(req.url, "http://localhost");
  const queryKey = url.searchParams.get("key");
  const configuredKey = process.env.VOLTAGENT_CONSOLE_ACCESS_KEY;

  if (configuredKey && (consoleKey === configuredKey || queryKey === configuredKey)) {
    return true;
  }

  return false;
}
