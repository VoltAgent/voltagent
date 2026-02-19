import type { ServerProviderDeps, WorkflowStateEntry } from "@voltagent/core";
import type { Logger } from "@voltagent/internal";
import { describe, expect, it, vi } from "vitest";
import type { ErrorResponse } from "../types/responses";
import { isErrorResponse } from "../types/responses";
import { handleAttachWorkflowStream, handleStreamWorkflow } from "./workflow.handlers";

type ParsedSSEEvent = {
  id?: string;
  data: Record<string, unknown>;
};

function createLogger(): Logger {
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

function createSuspendController() {
  return {
    signal: new AbortController().signal,
    suspend: vi.fn(),
    cancel: vi.fn(),
    isSuspended: vi.fn().mockReturnValue(false),
    isCancelled: vi.fn().mockReturnValue(false),
    getReason: vi.fn(),
    getCancelReason: vi.fn(),
  };
}

function createDeps(options?: {
  workflowExists?: boolean;
  workflowState?: WorkflowStateEntry | null;
  streamFactory?: () => any;
}): {
  deps: ServerProviderDeps;
  getWorkflowState: ReturnType<typeof vi.fn>;
} {
  const getWorkflowState = vi.fn().mockResolvedValue(options?.workflowState ?? null);
  const stream = options?.streamFactory ? options.streamFactory : vi.fn();

  const workflow = {
    createSuspendController: vi.fn().mockReturnValue(createSuspendController()),
    stream,
    memory: {
      getWorkflowState,
      queryWorkflowRuns: vi.fn().mockResolvedValue([]),
    },
  };

  const deps = {
    agentRegistry: {} as any,
    workflowRegistry: {
      getWorkflow: vi.fn((id: string) => {
        if (options?.workflowExists === false || id !== "wf-1") {
          return undefined;
        }

        return { workflow };
      }),
      getWorkflowsForApi: vi.fn(),
      getWorkflowDetailForApi: vi.fn(),
      getWorkflowCount: vi.fn(),
      getAllWorkflowIds: vi.fn().mockReturnValue(["wf-1"]),
      on: vi.fn(),
      off: vi.fn(),
      activeExecutions: new Map(),
      resumeSuspendedWorkflow: vi.fn(),
    },
    triggerRegistry: {} as any,
  } as unknown as ServerProviderDeps;

  return { deps, getWorkflowState };
}

async function readSSEEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<ParsedSSEEvent> {
  const { done, value } = await reader.read();
  expect(done).toBe(false);
  expect(value).toBeDefined();

  const chunk = new TextDecoder().decode(value);
  const lines = chunk
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);

  const dataLines: string[] = [];
  let id: string | undefined;

  for (const line of lines) {
    if (line.startsWith("id:")) {
      id = line.slice(3).trim();
      continue;
    }

    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  return {
    id,
    data: JSON.parse(dataLines.join("\n")) as Record<string, unknown>,
  };
}

function assertErrorResponse(
  value: ReadableStream | ErrorResponse,
): asserts value is ErrorResponse {
  expect(isErrorResponse(value)).toBe(true);
}

describe("workflow stream attach handler", () => {
  it("returns 404 when workflow does not exist", async () => {
    const logger = createLogger();
    const { deps } = createDeps({ workflowExists: false });

    const response = await handleAttachWorkflowStream("wf-1", "exec-1", {}, deps, logger);

    assertErrorResponse(response);
    expect(response.httpStatus).toBe(404);
    expect(response.error).toContain("Workflow not found");
  });

  it("returns 409 when execution is terminal and not streamable", async () => {
    const logger = createLogger();
    const { deps } = createDeps({
      workflowState: {
        id: "exec-1",
        workflowId: "wf-1",
        workflowName: "Workflow 1",
        status: "completed",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const response = await handleAttachWorkflowStream("wf-1", "exec-1", {}, deps, logger);

    assertErrorResponse(response);
    expect(response.httpStatus).toBe(409);
    expect(response.error).toContain("not streamable");
  });

  it("returns 409 when execution exists but has no active stream session", async () => {
    const logger = createLogger();
    const { deps } = createDeps({
      workflowState: {
        id: "exec-1",
        workflowId: "wf-1",
        workflowName: "Workflow 1",
        status: "running",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const response = await handleAttachWorkflowStream("wf-1", "exec-1", {}, deps, logger);

    assertErrorResponse(response);
    expect(response.httpStatus).toBe(409);
    expect(response.error).toContain("no active stream context");
  });

  it("attaches to active stream and replays from sequence cursor", async () => {
    const logger = createLogger();

    let releaseSecondEvent: (() => void) | null = null;
    const secondEventReady = new Promise<void>((resolve) => {
      releaseSecondEvent = resolve;
    });

    const executionId = "exec-stream-1";
    const { deps } = createDeps({
      workflowState: {
        id: executionId,
        workflowId: "wf-1",
        workflowName: "Workflow 1",
        status: "running",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      streamFactory: () => ({
        executionId,
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "workflow-start",
            executionId,
            from: "Workflow 1",
            status: "running",
            timestamp: new Date().toISOString(),
          };

          await secondEventReady;

          yield {
            type: "step-complete",
            executionId,
            from: "Step 1",
            status: "success",
            timestamp: new Date().toISOString(),
          };
        },
        result: Promise.resolve({ ok: true }),
        status: Promise.resolve("completed"),
        endAt: Promise.resolve(new Date("2026-01-01T00:00:00.000Z")),
      }),
    });

    const initialStreamResponse = await handleStreamWorkflow("wf-1", { input: {} }, deps, logger);
    expect(isErrorResponse(initialStreamResponse)).toBe(false);

    if (isErrorResponse(initialStreamResponse)) {
      return;
    }

    const primaryReader = initialStreamResponse.getReader();
    const firstEvent = await readSSEEvent(primaryReader);
    expect(firstEvent.data.type).toBe("workflow-start");

    const attachResponse = await handleAttachWorkflowStream(
      "wf-1",
      executionId,
      {
        fromSequence: firstEvent.id,
      },
      deps,
      logger,
    );
    expect(isErrorResponse(attachResponse)).toBe(false);

    if (isErrorResponse(attachResponse)) {
      return;
    }

    const attachedReader = attachResponse.getReader();

    expect(releaseSecondEvent).not.toBeNull();
    releaseSecondEvent?.();

    const primarySecond = await readSSEEvent(primaryReader);
    expect(primarySecond.data.type).toBe("step-complete");

    const attachedSecond = await readSSEEvent(attachedReader);
    expect(attachedSecond.data.type).toBe("step-complete");

    const primaryFinal = await readSSEEvent(primaryReader);
    expect(primaryFinal.data.type).toBe("workflow-result");

    const attachedFinal = await readSSEEvent(attachedReader);
    expect(attachedFinal.data.type).toBe("workflow-result");
  });
});
