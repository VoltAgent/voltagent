/**
 * Authentication utility functions
 */

/**
 * Check if the current process is running in an explicit dev/test environment.
 * Undefined/empty NODE_ENV is treated as production (fail-closed) to prevent
 * accidental auth bypass on deployments that forget to set NODE_ENV.
 */
export function isDevEnvironment(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
  );
}

/**
 * Check if request is from development environment
 *
 * Requires BOTH a client header AND an explicit dev/test environment for security.
 * Undefined NODE_ENV is treated as production (fail-closed) to prevent
 * accidental auth bypass on deployed servers that forgot to set NODE_ENV.
 *
 * @param req - The incoming HTTP request
 * @returns True if both dev header and non-production environment are present
 *
 * @example
 * // Development with header (typical case)
 * NODE_ENV=development + x-voltagent-dev=true → true (auth bypassed)
 *
 * // Test with header
 * NODE_ENV=test + x-voltagent-dev=true → true (auth bypassed)
 *
 * // Undefined NODE_ENV with header (deployed server)
 * NODE_ENV=undefined + x-voltagent-dev=true → false (auth required)
 *
 * // Production with header (attacker attempt)
 * NODE_ENV=production + x-voltagent-dev=true → false (auth required)
 *
 * @security
 * - Client header alone: Cannot bypass auth
 * - Dev/test env alone: Developer can still test auth
 * - Both required: Selective bypass for DX
 * - Only NODE_ENV=development|test enables dev bypass (fail-closed)
 */
export function isDevRequest(req: Request): boolean {
  const isDevEnv = isDevEnvironment();
  if (!isDevEnv) {
    return false;
  }

  const hasDevHeader = req.headers.get("x-voltagent-dev") === "true";
  if (hasDevHeader) {
    return true;
  }

  const url = new URL(req.url, "http://localhost");
  return url.searchParams.get("dev") === "true";
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
