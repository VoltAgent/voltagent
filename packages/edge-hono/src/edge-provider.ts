import { type IEdgeProvider, type ServerProviderDeps, mergeProcessEnv } from "@voltagent/core/edge";
import type { Hono } from "hono";
import { createEdgeApp } from "./app-factory";
import type { EdgeConfig, EdgeRuntime } from "./types";
import { detectEdgeRuntime } from "./utils/runtime-detection";
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

  async handleRequest(request: Request): Promise<Response> {
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
        if (this.deps.ensureEnvironment) {
          this.deps.ensureEnvironment(env);
        } else {
          mergeProcessEnv(env);
        }
        const app = await this.getApp();
        return app.fetch(request, env as Record<string, unknown>, executionCtx as any);
      },
    };
  }

  toVercelEdge(): (request: Request, context?: unknown) => Promise<Response> {
    return async (request: Request, context?: unknown) => {
      if (this.deps.ensureEnvironment) {
        this.deps.ensureEnvironment(context as Record<string, unknown> | undefined);
      } else {
        mergeProcessEnv(context as Record<string, unknown> | undefined);
      }
      const app = await this.getApp();
      return app.fetch(request, context as Record<string, unknown> | undefined);
    };
  }

  toNetlifyEdge(): (request: Request, context: unknown) => Promise<Response> {
    return async (request: Request, context: unknown) => {
      if (this.deps.ensureEnvironment) {
        this.deps.ensureEnvironment({ context } as Record<string, unknown>);
      } else {
        mergeProcessEnv({ context } as Record<string, unknown>);
      }
      const app = await this.getApp();
      return app.fetch(request, { context } as Record<string, unknown>);
    };
  }

  toDeno(): (request: Request, info?: unknown) => Promise<Response> {
    return async (request: Request, info?: unknown) => {
      if (this.deps.ensureEnvironment) {
        this.deps.ensureEnvironment(info as Record<string, unknown> | undefined);
      } else {
        mergeProcessEnv(info as Record<string, unknown> | undefined);
      }
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
