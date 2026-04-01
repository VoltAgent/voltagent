import { AbstractAgent } from "@ag-ui/client";
import type { RunAgentInput } from "@ag-ui/core";
import {
  CopilotRuntime,
  type CopilotServiceAdapter,
  ExperimentalEmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import type { Agent } from "@voltagent/core";
import { AgentRegistry } from "@voltagent/core";
import { createVoltAgentAGUI } from "./voltagent-agent";

export type CopilotKitHandlerOptions = {
  /**
   * Static map of AG-UI agents. Use either this or `loadAgents`.
   */
  agents?: Record<string, AbstractAgent>;
  /**
   * Lazy loader for AG-UI agents. If provided, it overrides `agents`.
   */
  loadAgents?: () => Promise<Record<string, AbstractAgent>> | Record<string, AbstractAgent>;
  /**
   * Optional service adapter. Defaults to ExperimentalEmptyAdapter.
   */
  serviceAdapter?: CopilotServiceAdapter;
  /**
   * Endpoint path used by CopilotKit clients. Defaults to "/copilotkit".
   */
  endpoint?: string;
};

export type RegisterCopilotKitRoutesOptions = {
  /**
   * Hono-style app instance with `all(path, handler)` support.
   */
  app: {
    all: (path: string, handler: (c: any) => any) => any;
    post?: (path: string, handler: (c: any) => any) => any;
  };
  /**
   * VoltAgent agents to expose to CopilotKit. Will be wrapped lazily.
   */
  agents?: Record<string, Agent>;
  /**
   * Optional resource IDs to pick from the global AgentRegistry if `agents` is not provided.
   * If omitted and no agents are provided, all registered agents will be exposed.
   */
  resourceIds?: string[];
  /**
   * Path to mount CopilotKit endpoint. Defaults to "/copilotkit".
   */
  path?: string;
};

/**
 * Create a framework-agnostic fetch handler for CopilotKit that serves VoltAgent-backed AG-UI agents.
 *
 * @example
 * ```ts
 * import { createCopilotKitHandler } from "@voltagent/ag-ui";
 * import { createVoltAgentAGUI } from "@voltagent/ag-ui";
 * import { agent } from "./agent"; // VoltAgent instance
 *
 * const handler = createCopilotKitHandler({
 *   agents: { assistant: createVoltAgentAGUI({ agent }) },
 *   endpoint: "/api/copilotkit",
 * });
 *
 * export default {
 *   fetch: handler,
 * };
 * ```
 */
export function createCopilotKitHandler(options: CopilotKitHandlerOptions) {
  const endpoint = options.endpoint ?? "/copilotkit";
  const serviceAdapter = options.serviceAdapter ?? new ExperimentalEmptyAdapter();

  return async (req: Request): Promise<Response> => {
    // We intentionally avoid logging request bodies to keep the handler silent in production.
    await req
      .clone()
      .text()
      .catch(() => undefined);

    const agents =
      (await options.loadAgents?.()) ??
      options.agents ??
      (() => {
        throw new Error("No agents provided to CopilotKit handler");
      })();

    // Lightweight wrapper to add per-run/connect logging without touching the original agents
    const wrappedAgents: Record<string, AbstractAgent> = {};
    for (const [id, agent] of Object.entries(agents)) {
      wrappedAgents[id] = new (class extends AbstractAgent {
        run(input: RunAgentInput) {
          console.log("[CopilotKit] agent.run", {
            agentId: id,
            threadId: input.threadId,
            runId: input.runId,
          });
          return (agent as AbstractAgent).run(input);
        }
        // Forward connect if the agent implements it
        connect(input: RunAgentInput) {
          console.log("[CopilotKit] agent.connect", {
            agentId: id,
            threadId: input.threadId,
            runId: input.runId,
          });
          return (agent as any).connect?.(input);
        }
        clone() {
          return this;
        }
      })();
    }

    const runtime = new CopilotRuntime({ agents: wrappedAgents });

    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter,
      endpoint,
    });

    let response: Response;
    try {
      response = await handleRequest(req);
    } catch (error) {
      console.error("[CopilotKit] handler failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
    return response;
  };
}

/**
 * Convenience helper: register CopilotKit routes on a Hono-like app using VoltAgent agents.
 */
export function registerCopilotKitRoutes(options: RegisterCopilotKitRoutesOptions) {
  const path = options.path ?? "/copilotkit";
  const resolveAgents = (): Record<string, Agent> => {
    if (options.agents) return options.agents;
    const registry = AgentRegistry.getInstance();
    const ids = options.resourceIds;
    if (ids && ids.length > 0) {
      return Object.fromEntries(
        ids
          .map((id) => {
            const agent = registry.getAgent(id);
            return agent ? [id, agent] : undefined;
          })
          .filter(Boolean) as [string, Agent][],
      );
    }
    return Object.fromEntries(registry.getAllAgents().map((agent) => [agent.id, agent]));
  };

  const handler = createCopilotKitHandler({
    loadAgents: () =>
      Object.fromEntries(
        Object.entries(resolveAgents()).map(([id, agent]) => [id, createVoltAgentAGUI({ agent })]),
      ),
    endpoint: path,
  });

  const routeHandler = async (c: any) => {
    const method = c.req?.method;
    if (method && method !== "POST") {
      return c.json?.({ success: false, error: "Use POST with CopilotKit runtime requests." }, 405);
    }

    try {
      return await handler(c.req?.raw ?? c.request ?? c);
    } catch (error) {
      console.error("[copilotkit] handler error", error);
      return c.json?.(
        { success: false, error: "CopilotKit handler failed", detail: `${error}` },
        500,
      );
    }
  };

  const register = (p: string) => {
    if (typeof options.app.post === "function") {
      options.app.post(p, routeHandler);
    } else {
      options.app.all(p, routeHandler);
    }
  };

  [path, `${path}/*`].forEach(register);
  // Deliberately no return; route registration side-effect only
}
