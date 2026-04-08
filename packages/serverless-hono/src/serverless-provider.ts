import type { IServerlessProvider, ServerProviderDeps } from "@voltagent/core";
import type { Hono } from "hono";
import { createServerlessApp } from "./app-factory";
import type { ServerlessConfig, ServerlessRuntime } from "./types";
import { detectServerlessRuntime } from "./utils/runtime-detection";
import { type WaitUntilContext, withWaitUntil } from "./utils/wait-until-wrapper";

type VoltAgentGlobal = typeof globalThis & {
  ___voltagent_wait_until?: (promise: Promise<unknown>) => void;
};

/**
 * Defers the waitUntil cleanup so the global stays alive while streaming and
 * tool execution are still in progress.
 *
 * We wrap the global `___voltagent_wait_until` with a tracking proxy that
 * records every promise registered by tools and observability exporters.
 * Cleanup only runs after **all** tracked promises settle, guaranteeing the
 * global is available for the entire lifetime of the request.
 *
 * If the platform context has no `waitUntil` (non-serverless), we fall back
 * to immediate cleanup.
 */
export function deferCleanup(
  context: WaitUntilContext | null | undefined,
  cleanup: () => void,
): void {
  const waitUntil = context?.waitUntil;
  if (!waitUntil || typeof waitUntil !== "function") {
    cleanup();
    return;
  }

  try {
    const tracked: Promise<unknown>[] = [];
    const originalWaitUntil = waitUntil.bind(context);
    const globals = globalThis as VoltAgentGlobal;

    // Replace the global with a tracking wrapper so every promise
    // registered by tools / observability is captured.
    const currentGlobal = globals.___voltagent_wait_until;
    if (currentGlobal) {
      globals.___voltagent_wait_until = (promise: Promise<unknown>) => {
        tracked.push(promise);
        originalWaitUntil(promise);
      };
    }

    // Schedule cleanup to run only after every tracked promise settles.
    const cleanupWhenDone = Promise.resolve().then(async () => {
      // Wait in a loop — new promises may be registered while we wait.
      let settled = 0;
      while (settled < tracked.length) {
        const batch = tracked.slice(settled);
        await Promise.allSettled(batch);
        settled += batch.length;
      }
      cleanup();
    });

    originalWaitUntil(cleanupWhenDone);
  } catch {
    // waitUntil can throw after the response is committed on some
    // platforms — fall through to synchronous cleanup.
    cleanup();
  }
}

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
        const cleanup = withWaitUntil(executionCtx as WaitUntilContext | undefined);

        try {
          await this.ensureEnvironmentTarget(env);
          const app = await this.getApp();
          return await app.fetch(request, env as Record<string, unknown>, executionCtx as any);
        } finally {
          deferCleanup(executionCtx as WaitUntilContext | undefined, cleanup);
        }
      },
    };
  }

  toVercelEdge(): (request: Request, context?: unknown) => Promise<Response> {
    return async (request: Request, context?: unknown) => {
      const cleanup = withWaitUntil(context as WaitUntilContext | undefined);

      try {
        await this.ensureEnvironmentTarget(context as Record<string, unknown> | undefined);
        const app = await this.getApp();
        return await app.fetch(request, context as Record<string, unknown> | undefined);
      } finally {
        deferCleanup(context as WaitUntilContext | undefined, cleanup);
      }
    };
  }

  toDeno(): (request: Request, info?: unknown) => Promise<Response> {
    return async (request: Request, info?: unknown) => {
      const cleanup = withWaitUntil(info as WaitUntilContext | undefined);

      try {
        await this.ensureEnvironmentTarget(info as Record<string, unknown> | undefined);
        const app = await this.getApp();
        return await app.fetch(request, info as Record<string, unknown> | undefined);
      } finally {
        deferCleanup(info as WaitUntilContext | undefined, cleanup);
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
