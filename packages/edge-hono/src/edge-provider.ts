import type { IEdgeProvider, ServerProviderDeps } from "@voltagent/core";
import type { Hono } from "hono";
import { createEdgeApp } from "./app-factory";
import type { EdgeConfig, EdgeRuntime } from "./types";
import { detectEdgeRuntime } from "./utils/runtime-detection";

type VoltAgentGlobal = typeof globalThis & {
  ___voltagent_wait_until?: (promise: Promise<unknown>) => void;
};
export class HonoEdgeProvider implements IEdgeProvider {
  private readonly deps: ServerProviderDeps;
  private readonly config?: EdgeConfig;
  private readonly appPromise: Promise<Hono>;

  constructor(deps: ServerProviderDeps, config?: EdgeConfig) {
    this.deps = deps;
    this.config = config;
    this.appPromise = this.initializeApp();
  }

  private async initializeApp(): Promise<Hono> {
    return createEdgeApp(this.deps, this.config);
  }

  private async getApp(): Promise<Hono> {
    return this.appPromise;
  }

  private async ensureEnvironmentTarget(target?: Record<string, unknown>): Promise<void> {
    if (this.deps.ensureEnvironment) {
      await Promise.resolve(this.deps.ensureEnvironment(target));
    }
  }

  async handleRequest(request: Request): Promise<Response> {
    await this.ensureEnvironmentTarget();
    const app = await this.getApp();
    return app.fetch(request);
  }

  toCloudflareWorker() {
    return {
      fetch: async (
        request: Request,
        env: Record<string, unknown>,
        executionCtx: unknown,
      ): Promise<Response> => {
        const waitUntil =
          executionCtx && typeof (executionCtx as any)?.waitUntil === "function"
            ? (executionCtx as any).waitUntil.bind(executionCtx)
            : undefined;

        const globals = globalThis as VoltAgentGlobal;
        const previousWaitUntil = globals.___voltagent_wait_until;

        if (waitUntil) {
          globals.___voltagent_wait_until = (promise) => {
            try {
              waitUntil(promise);
            } catch {
              void promise;
            }
          };
        }

        try {
          await this.ensureEnvironmentTarget(env);
          const app = await this.getApp();
          return await app.fetch(request, env as Record<string, unknown>, executionCtx as any);
        } finally {
          if (waitUntil) {
            if (previousWaitUntil) {
              globals.___voltagent_wait_until = previousWaitUntil;
            } else {
              globals.___voltagent_wait_until = undefined;
            }
          }
        }
      },
    };
  }

  toVercelEdge(): (request: Request, context?: unknown) => Promise<Response> {
    return async (request: Request, context?: unknown) => {
      await this.ensureEnvironmentTarget(context as Record<string, unknown> | undefined);
      const app = await this.getApp();
      return app.fetch(request, context as Record<string, unknown> | undefined);
    };
  }

  toNetlifyEdge(): (request: Request, context: unknown) => Promise<Response> {
    return async (request: Request, context: unknown) => {
      await this.ensureEnvironmentTarget({ context } as Record<string, unknown>);
      const app = await this.getApp();
      return app.fetch(request, { context } as Record<string, unknown>);
    };
  }

  toDeno(): (request: Request, info?: unknown) => Promise<Response> {
    return async (request: Request, info?: unknown) => {
      await this.ensureEnvironmentTarget(info as Record<string, unknown> | undefined);
      const app = await this.getApp();
      return app.fetch(request, info as Record<string, unknown> | undefined);
    };
  }

  auto():
    | { fetch: (req: Request, env: Record<string, unknown>, ctx: unknown) => Promise<Response> }
    | ((req: Request, ctx?: unknown) => Promise<Response>) {
    const runtime: EdgeRuntime = detectEdgeRuntime();

    switch (runtime) {
      case "cloudflare":
        return this.toCloudflareWorker();
      case "vercel":
        return this.toVercelEdge();
      case "netlify":
        return this.toNetlifyEdge();
      case "deno":
        return this.toDeno();
      default:
        return this.toCloudflareWorker();
    }
  }
}
