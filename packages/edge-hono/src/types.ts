import type { ServerProviderDeps } from "@voltagent/core";
import type { Hono } from "hono";

export type EdgeRuntime = "cloudflare" | "vercel" | "netlify" | "deno" | "unknown";

export interface EdgeConfig {
  corsOrigin?: string | string[];
  corsAllowMethods?: string[];
  corsAllowHeaders?: string[];
  maxRequestSize?: number;
  configureApp?: (app: Hono, deps: ServerProviderDeps) => void | Promise<void>;
}
