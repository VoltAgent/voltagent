import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeOutputGuardrailList } from "../guardrail";
import type { VoltAgentTextStreamPart } from "../subagent/types";
import { createTestAgent } from "../test-utils";
import type { OutputGuardrail } from "../types";
import type { AgentEvalOperationType, OperationContext } from "../types";
import { OutputGuardrailStreamRunner } from "./output-guardrail-stream-runner";

const createMockSpan = () => ({
  addEvent: vi.fn(),
  setStatus: vi.fn(),
  setAttribute: vi.fn(),
  end: vi.fn(),
  recordException: vi.fn(),
});

const createOperationContext = (): OperationContext => {
  const span = createMockSpan();
  const traceContext = {
    createChildSpan: vi.fn(() => createMockSpan()),
    withSpan: vi.fn(async (_span: any, fn: () => Promise<any> | any) => fn()),
    setOutput: vi.fn(),
    end: vi.fn(),
    getRootSpan: vi.fn(() => span),
  };

  return {
    operationId: "op-1",
    context: new Map(),
    systemContext: new Map(),
    isActive: true,
    traceContext: traceContext as unknown as OperationContext["traceContext"],
    logger: {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    abortController: new AbortController(),
    startTime: new Date(),
  } as OperationContext;
};

describe("OutputGuardrailStreamRunner", () => {
  let operationContext: OperationContext;
  const agent = createTestAgent();

  beforeEach(() => {
    operationContext = createOperationContext();
  });

  const createRunner = (guardrail: OutputGuardrail<string>) => {
    const guardrails = normalizeOutputGuardrailList([guardrail]);
    return new OutputGuardrailStreamRunner({
      guardrails,
      agent,
      operationContext,
      operation: "streamText" as AgentEvalOperationType,
    });
  };

  it("applies stream handler modifications to text chunks", async () => {
    const runner = createRunner({
      id: "redact-digits",
      name: "Redact Digits",
      handler: async () => ({ pass: true }),
      streamHandler: ({ part }) => {
        if (part.type !== "text-delta") {
          return part;
        }
        const text = (part.text ?? (part as { delta?: string }).delta ?? "").replace(/\d+/g, "[#]");
        return { ...part, text, delta: text };
      },
    });

    await runner.processPart({ type: "text-start", id: "text-1" } as VoltAgentTextStreamPart);
    const processed = await runner.processPart({
      type: "text-delta",
      id: "text-1",
      text: "Account 1234",
      delta: "Account 1234",
    });

    expect(processed?.delta).toBe("Account [#]");
    expect(runner.getSanitizedText()).toBe("Account [#]");
  });

  it("filters chunks when stream handler returns null", async () => {
    const runner = createRunner({
      id: "filter-secret",
      name: "Filter Secret",
      handler: async () => ({ pass: true }),
      streamHandler: ({ part }) => {
        if (part.type === "text-delta" && (part.text ?? "").includes("secret")) {
          return null;
        }
        return part;
      },
    });

    await runner.processPart({ type: "text-start", id: "text-1" } as VoltAgentTextStreamPart);
    const filtered = await runner.processPart({
      type: "text-delta",
      id: "text-1",
      text: "This is secret information",
      delta: "This is secret information",
    });

    expect(filtered).toBeNull();
    expect(runner.getSanitizedText()).toBe("");
  });

  it("aborts the stream when abort is invoked", async () => {
    const runner = createRunner({
      id: "abort-guard",
      name: "Abort Guard",
      handler: async () => ({ pass: true }),
      streamHandler: ({ abort }) => {
        abort("Blocked by guardrail");
      },
    });

    await expect(
      runner.processPart({
        type: "text-delta",
        id: "text-1",
        text: "should abort",
        delta: "should abort",
      }),
    ).rejects.toMatchObject({ message: "Blocked by guardrail" });
  });

  it("appends finalize diff when final guardrail modifies the output", async () => {
    const runner = createRunner({
      id: "append-check",
      name: "Append Check",
      handler: async ({ output }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: `${output} ✅`,
      }),
      streamHandler: ({ part }) => {
        if (part.type !== "text-delta") {
          return part;
        }
        const text = (part.text ?? (part as { delta?: string }).delta ?? "").replace(
          /\d+/g,
          "[redacted]",
        );
        return { ...part, text, delta: text };
      },
    });

    await runner.processPart({ type: "text-start", id: "text-1" } as VoltAgentTextStreamPart);
    await runner.processPart({
      type: "text-delta",
      id: "text-1",
      text: "Account 9876",
      delta: "Account 9876",
    });

    await runner.finalize({});
    expect(runner.getSanitizedText()).toBe("Account [redacted] ✅");
  });
});
