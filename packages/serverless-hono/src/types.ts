import type { ServerProviderDeps } from "@voltagent/core";
import type { Hono } from "hono";

export type ServerlessRuntime = "cloudflare" | "vercel" | "deno" | "unknown";

export interface ServerlessConfig {
  corsOrigin?: string | string[];
  corsAllowMethods?: string[];
  corsAllowHeaders?: string[];
  maxRequestSize?: number;
  configureApp?: (app: Hono, deps: ServerProviderDeps) => void | Promise<void>;
}
