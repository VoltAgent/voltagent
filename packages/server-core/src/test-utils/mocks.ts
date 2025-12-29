import type { ServerProviderDeps } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { vi } from "vitest";

/**
 * Create a mock logger for testing
 */
export function createMockLogger(): Logger {
  return {
    trace: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    level: "info",
    silent: vi.fn(),
  } as unknown as Logger;
}

/**
 * Create a mock agent for testing
 */
export function createMockAgent(id = "test-agent", name = "Test Agent") {
  return {
    id,
    name,
    getFullState: vi.fn().mockReturnValue({
      id,
      name,
      instructions: "Test instructions",
      status: "idle",
      model: "test-model",
      tools: [],
      subAgents: [],
      memory: {},
    }),
    isTelemetryConfigured: vi.fn().mockReturnValue(false),
    generateText: vi.fn().mockResolvedValue({
      text: "Generated text",
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
      finishReason: "stop",
    }),
    streamText: vi.fn().mockReturnValue({
      toUIMessageStreamResponse: vi.fn().mockReturnValue(new Response()),
    }),
    generateObject: vi.fn().mockResolvedValue({
      object: { test: "object" },
    }),
    streamObject: vi.fn().mockReturnValue({
      partialObjectStream: (async function* () {
        yield { partial: true };
        yield { partial: false };
      })(),
      object: Promise.resolve({ complete: true }),
    }),
    getHistory: vi.fn().mockResolvedValue({
      messages: [],
      total: 0,
      page: 0,
      limit: 10,
    }),
  };
}

/**
 * Create a mock workflow for testing
 */
export function createMockWorkflow(id = "test-workflow", name = "Test Workflow") {
  return {
    id,
    name,
    purpose: "Test purpose",
    stepsCount: 1,
    status: "idle",
    steps: [],
    run: vi.fn().mockResolvedValue({
      executionId: "exec-123",
      startAt: new Date(),
      endAt: new Date(),
      result: { success: true },
    }),
    stream: vi.fn().mockReturnValue({
      executionId: "exec-123",
      [Symbol.asyncIterator]: async function* () {
        yield { type: "step-start", step: "step1" };
        yield { type: "step-complete", step: "step1" };
      },
      result: Promise.resolve({ success: true }),
      status: Promise.resolve("completed"),
      endAt: Promise.resolve(new Date()),
    }),
    createSuspendController: vi.fn().mockReturnValue({
      signal: new AbortController().signal,
      suspend: vi.fn(),
      cancel: vi.fn(),
      isSuspended: vi.fn().mockReturnValue(false),
      isCancelled: vi.fn().mockReturnValue(false),
      getReason: vi.fn(),
      getCancelReason: vi.fn(),
    }),
  };
}

/**
 * Create mock ServerProviderDeps for testing
 */
export function createMockDeps(): ServerProviderDeps {
  const mockAgent = createMockAgent();
  const mockWorkflow = createMockWorkflow();

  return {
    agentRegistry: {
      getAllAgents: vi.fn().mockReturnValue([mockAgent]),
      getAgent: vi.fn().mockReturnValue(mockAgent),
      registerAgent: vi.fn(),
      unregisterAgent: vi.fn(),
      getAgentCount: vi.fn().mockReturnValue(1),
    },
    workflowRegistry: {
      getWorkflowsForApi: vi.fn().mockReturnValue([mockWorkflow]),
      getWorkflowDetailForApi: vi.fn().mockReturnValue(mockWorkflow),
      getWorkflow: vi.fn().mockReturnValue({ workflow: mockWorkflow }),
      getWorkflowCount: vi.fn().mockReturnValue(1),
      on: vi.fn(),
      off: vi.fn(),
      activeExecutions: new Map(),
      resumeSuspendedWorkflow: vi.fn().mockResolvedValue({
        executionId: "exec-123",
        startAt: new Date(),
        endAt: new Date(),
        status: "completed",
        result: { success: true },
      }),
    },
    triggerRegistry: {
      list: vi.fn().mockReturnValue([]),
      register: vi.fn(),
      registerMany: vi.fn(),
      get: vi.fn(),
      getByPath: vi.fn(),
      unregister: vi.fn(),
      clear: vi.fn(),
    } as any,
    logger: createMockLogger(),
    telemetryExporter: undefined,
    voltOpsClient: undefined,
  } as unknown as ServerProviderDeps;
}

/**
 * Wait for a condition to be true
 */
export async function waitFor(
  condition: () => boolean,
  timeout = 1000,
  interval = 10,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw new Error("Timeout waiting for condition");
}

/**
 * Create a promise that resolves after a delay
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
