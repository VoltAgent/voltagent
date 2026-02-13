import { afterEach, describe, expect, it, vi } from "vitest";

import { Agent } from "./agent";
import type { AgentConversationPersistenceOptions } from "./types";

type QueueMock = {
  scheduleSave: ReturnType<typeof vi.fn>;
  flush: ReturnType<typeof vi.fn>;
};

const createOperationContext = () =>
  ({
    operationId: "op-step-persist",
    systemContext: new Map<string | symbol, unknown>(),
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
    },
    abortController: new AbortController(),
    userId: "user-1",
    conversationId: "conv-1",
  }) as any;

const createStepEvent = (content: any[]) =>
  ({
    content,
    response: {
      messages: [
        {
          role: "assistant",
          content: [{ type: "text", text: "checkpoint" }],
        },
      ],
    },
  }) as any;

const createHarness = (overrides: AgentConversationPersistenceOptions) => {
  const agent = new Agent({
    name: "step-persistence-agent",
    instructions: "Test",
    model: "openai/gpt-4o-mini",
  });

  const queue: QueueMock = {
    scheduleSave: vi.fn(),
    flush: vi.fn().mockResolvedValue(undefined),
  };

  const buffer = {
    addModelMessages: vi.fn(),
  };

  const oc = createOperationContext();

  const persistence = {
    mode: "step" as const,
    debounceMs: 200,
    flushOnToolResult: true,
    ...overrides,
  };

  vi.spyOn(agent as any, "getConversationBuffer").mockReturnValue(buffer);
  vi.spyOn(agent as any, "getMemoryPersistQueue").mockReturnValue(queue);
  vi.spyOn(agent as any, "getConversationPersistenceOptionsForContext").mockReturnValue(
    persistence,
  );
  const recordStepResultsSpy = vi
    .spyOn(agent as any, "recordStepResults")
    .mockResolvedValue(undefined);

  const handler = (agent as any).createStepHandler(oc, undefined) as (event: any) => Promise<void>;

  return {
    queue,
    oc,
    handler,
    recordStepResultsSpy,
  };
};

describe("Step-level persistence", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules debounced persistence for non-tool steps in step mode", async () => {
    const { handler, queue, oc, recordStepResultsSpy } = createHarness({ mode: "step" });

    await handler(createStepEvent([{ type: "text", text: "hello" }]));

    expect(queue.scheduleSave).toHaveBeenCalledTimes(1);
    expect(queue.scheduleSave).toHaveBeenCalledWith(expect.anything(), oc);
    expect(queue.flush).not.toHaveBeenCalled();
    expect(recordStepResultsSpy).toHaveBeenCalledWith(undefined, oc, {
      awaitPersistence: false,
    });
  });

  it("flushes immediately when a tool result arrives in step mode", async () => {
    const { handler, queue, oc, recordStepResultsSpy } = createHarness({ mode: "step" });

    await handler(
      createStepEvent([
        {
          type: "tool-result",
          toolName: "search",
          toolCallId: "call-1",
          output: { ok: true },
        },
      ]),
    );

    expect(queue.flush).toHaveBeenCalledTimes(1);
    expect(queue.flush).toHaveBeenCalledWith(expect.anything(), oc);
    expect(queue.scheduleSave).not.toHaveBeenCalled();
    expect(recordStepResultsSpy).toHaveBeenCalledWith(undefined, oc, {
      awaitPersistence: true,
    });
  });

  it("keeps finish mode behavior without incremental checkpoints", async () => {
    const { handler, queue, recordStepResultsSpy } = createHarness({ mode: "finish" });

    await handler(createStepEvent([{ type: "text", text: "hello" }]));

    expect(queue.scheduleSave).not.toHaveBeenCalled();
    expect(queue.flush).not.toHaveBeenCalled();
    expect(recordStepResultsSpy).not.toHaveBeenCalled();
  });
});
