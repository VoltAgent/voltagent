import { DEFAULT_CONSOLE_ROUTES, pathMatches } from "./defaults";
import type { AuthProvider } from "./types";

export type AuthNextAccess = "public" | "console" | "user";

export interface AuthNextRoutesConfig {
  publicRoutes?: string[];
  consoleRoutes?: string[];
}

export interface AuthNextConfig<TRequest = any> extends AuthNextRoutesConfig {
  provider: AuthProvider<TRequest>;
}

export function isAuthNextConfig<TRequest>(
  value: AuthProvider<TRequest> | AuthNextConfig<TRequest>,
): value is AuthNextConfig<TRequest> {
  return typeof (value as AuthNextConfig<TRequest>).provider !== "undefined";
}

export function normalizeAuthNextConfig<TRequest>(
  value: AuthProvider<TRequest> | AuthNextConfig<TRequest>,
): AuthNextConfig<TRequest> {
  return isAuthNextConfig(value) ? value : { provider: value };
}

function routeMatches(method: string, path: string, routePattern: string): boolean {
  const parts = routePattern.split(" ");
  if (parts.length === 2) {
    const [routeMethod, routePath] = parts;
    if (method.toUpperCase() !== routeMethod.toUpperCase()) {
      return false;
    }
    return pathMatches(path, routePath);
  }

  return pathMatches(path, routePattern);
}

function matchesAnyRoute(method: string, path: string, routes?: string[]): boolean {
  if (!routes || routes.length === 0) {
    return false;
  }

  return routes.some((route) => routeMatches(method, path, route));
}

export function resolveAuthNextAccess<TRequest>(
  method: string,
  path: string,
  authNext: AuthNextConfig<TRequest> | AuthProvider<TRequest>,
): AuthNextAccess {
  const config = normalizeAuthNextConfig(authNext);
  const publicRoutes = [...(config.publicRoutes ?? []), ...(config.provider.publicRoutes ?? [])];

  if (matchesAnyRoute(method, path, publicRoutes)) {
    return "public";
  }

  const consoleRoutes = config.consoleRoutes ?? DEFAULT_CONSOLE_ROUTES;
  if (matchesAnyRoute(method, path, consoleRoutes)) {
    return "console";
  }

  return "user";
}
