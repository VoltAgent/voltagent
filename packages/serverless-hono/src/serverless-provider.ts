import type { IServerlessProvider, ServerProviderDeps } from "@voltagent/core";
import type { Hono } from "hono";
import { createServerlessApp } from "./app-factory";
import type { ServerlessConfig, ServerlessRuntime } from "./types";
import { detectServerlessRuntime } from "./utils/runtime-detection";
import { withWaitUntil } from "./utils/wait-until-wrapper";
export class HonoServerlessProvider implements IServerlessProvider {
  private readonly deps: ServerProviderDeps;
  private readonly config?: ServerlessConfig;
  private readonly appPromise: Promise<Hono>;

  constructor(deps: ServerProviderDeps, config?: ServerlessConfig) {
    this.deps = deps;
    this.config = config;
    this.appPromise = this.initializeApp();
  }

  private async initializeApp(): Promise<Hono> {
    return createServerlessApp(this.deps, this.config);
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
        const cleanup = withWaitUntil(executionCtx as any);

        try {
          await this.ensureEnvironmentTarget(env);
          const app = await this.getApp();
          return await app.fetch(request, env as Record<string, unknown>, executionCtx as any);
        } finally {
          cleanup();
        }
      },
    };
  }

  toVercelEdge(): (request: Request, context?: unknown) => Promise<Response> {
    return async (request: Request, context?: unknown) => {
      const cleanup = withWaitUntil(context as any);

      try {
        await this.ensureEnvironmentTarget(context as Record<string, unknown> | undefined);
        const app = await this.getApp();
        return await app.fetch(request, context as Record<string, unknown> | undefined);
      } finally {
        cleanup();
      }
    };
  }

  toDeno(): (request: Request, info?: unknown) => Promise<Response> {
    return async (request: Request, info?: unknown) => {
      const cleanup = withWaitUntil(info as any);

      try {
        await this.ensureEnvironmentTarget(info as Record<string, unknown> | undefined);
        const app = await this.getApp();
        return await app.fetch(request, info as Record<string, unknown> | undefined);
      } finally {
        cleanup();
      }
    };
  }

  auto():
    | { fetch: (req: Request, env: Record<string, unknown>, ctx: unknown) => Promise<Response> }
    | ((req: Request, ctx?: unknown) => Promise<Response>) {
    const runtime: ServerlessRuntime = detectServerlessRuntime();

    switch (runtime) {
      case "cloudflare":
        return this.toCloudflareWorker();
      case "vercel":
        return this.toVercelEdge();
      case "deno":
        return this.toDeno();
      default:
        return this.toCloudflareWorker();
    }
  }
}
