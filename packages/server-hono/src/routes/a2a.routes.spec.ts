import { A2AServerRegistry, type ServerProviderDeps, TriggerRegistry } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import * as serverCore from "@voltagent/server-core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OpenAPIHono } from "../zod-openapi-compat";
import { registerA2ARoutes } from "./a2a.routes";

vi.mock("@voltagent/server-core", async () => {
  const actual = await vi.importActual("@voltagent/server-core");
  return {
    ...actual,
    executeA2ARequest: vi.fn(),
    resolveAgentCard: vi.fn(),
    A2A_ROUTES: actual.A2A_ROUTES,
  };
});

vi.mock("@voltagent/a2a-server", async () => {
  return {
    normalizeError: vi.fn().mockImplementation((id, error) => ({
      jsonrpc: "2.0",
      id,
      error: {
        code: error.code || -32603,
        message: error.message,
      },
    })),
  };
});

function createMockA2ARegistry() {
  const registry = new A2AServerRegistry();
  registry.register(
    {
      getMetadata() {
        return {
          id: "server1",
          name: "server1",
          version: "1.0.0",
        };
      },
    },
    {
      agentRegistry: {
        getAgent() {
          return undefined;
        },
        getAllAgents() {
          return [];
        },
      },
    },
  );
  return registry;
}

function createMockDeps(): ServerProviderDeps {
  return {
    agentRegistry: {
      getAgent() {
        return undefined;
      },
      getAllAgents() {
        return [];
      },
      getAgentCount() {
        return 0;
      },
      removeAgent() {
        return false;
      },
      registerAgent() {},
      getGlobalVoltOpsClient() {
        return undefined;
      },
      getGlobalLogger() {
        return undefined;
      },
    },
    workflowRegistry: {
      getWorkflow() {
        return undefined;
      },
      getWorkflowsForApi() {
        return [];
      },
      getWorkflowDetailForApi() {
        return undefined;
      },
      getWorkflowCount() {
        return 0;
      },
      getAllWorkflowIds() {
        return [];
      },
      on() {},
      off() {},
      activeExecutions: new Map(),
      async resumeSuspendedWorkflow() {
        return undefined;
      },
    },
    triggerRegistry: new TriggerRegistry(),
    a2a: {
      registry: createMockA2ARegistry(),
    },
  };
}

function createMockLogger(): Logger {
  const logger: Logger = {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn(() => logger),
  };

  return logger;
}

describe("A2A Routes", () => {
  let app: InstanceType<typeof OpenAPIHono>;
  let mockDeps: ServerProviderDeps;
  let mockLogger: Logger;

  beforeEach(() => {
    app = new OpenAPIHono();
    mockDeps = createMockDeps();
    mockLogger = createMockLogger();
    registerA2ARoutes(app, mockDeps, mockLogger);
    vi.clearAllMocks();
  });

  it("passes the request URL when resolving the agent card", async () => {
    const card = {
      name: "agent",
      description: "desc",
      url: "https://agents.example/a2a/server1",
      version: "1.0.0",
      capabilities: {
        streaming: true,
        pushNotifications: false,
        stateTransitionHistory: false,
      },
      defaultInputModes: ["text"],
      defaultOutputModes: ["text"],
      skills: [],
    };
    vi.mocked(serverCore.resolveAgentCard).mockReturnValue(card);

    const requestUrl = "http://agents.example/.well-known/server1/agent-card.json";
    const response = await app.request(requestUrl);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(card);
    expect(serverCore.resolveAgentCard).toHaveBeenCalledWith(
      mockDeps.a2a?.registry,
      "server1",
      "server1",
      { requestUrl },
    );
  });
});
