/**
 * Regression tests for https://github.com/VoltAgent/voltagent/issues/1538
 *
 * An approved `needsApproval` tool executes before step 1, but its result
 * used to reach memory only via step 1's onStepFinish - after the next model
 * call. Interrupting the turn in between left memory at `approval-responded`
 * with no output, and a resent approval re-executed the tool without a new
 * approval prompt. The result must be flushed as soon as execution completes.
 */
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { createTool } from "../tool";
import { Agent } from "./agent";

const usage = {
  inputTokens: 10,
  outputTokens: 5,
  totalTokens: 15,
  inputTokenDetails: {
    noCacheTokens: 10,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  },
  outputTokenDetails: {
    textTokens: 5,
    reasoningTokens: 0,
  },
};

const memory = { userId: "u", conversationId: "c" };

const makeAgent = (
  storage: InMemoryStorageAdapter,
  counters: { executions: number },
  stepDelayMs = 0,
  contextLimit?: number,
) => {
  const model = new MockLanguageModelV3({
    modelId: "test-model",
    doGenerate: async ({ prompt, abortSignal }) => {
      if (prompt.some((m: any) => m.role === "tool")) {
        if (stepDelayMs > 0) {
          await new Promise((resolve, reject) => {
            const t = setTimeout(resolve, stepDelayMs);
            abortSignal?.addEventListener("abort", () => {
              clearTimeout(t);
              reject(new Error("aborted"));
            });
          });
        }
        return {
          content: [{ type: "text" as const, text: "Refund done." }],
          finishReason: { unified: "stop" as const, raw: "stop" },
          usage,
          warnings: [],
        };
      }
      return {
        content: [
          {
            type: "tool-call" as const,
            toolCallId: "call_1",
            toolName: "refund",
            input: '{"amount":50}',
          },
        ],
        finishReason: { unified: "tool-calls" as const, raw: "tool_use" },
        usage,
        warnings: [],
      };
    },
  });

  return new Agent({
    name: "a",
    instructions: "x",
    model: model as any,
    memory: new Memory({ storage, options: { contextLimit } }),
    tools: [
      createTool({
        name: "refund",
        description: "refund",
        parameters: z.object({ amount: z.number() }),
        needsApproval: true,
        execute: async () => ({ refundId: `re_${++counters.executions}` }),
      }),
    ],
  });
};

const approveStoredCall = async (storage: InMemoryStorageAdapter) => {
  const stored = await storage.getMessages("u", "c");
  const msg = structuredClone(stored.at(-1)) as any;
  const part = msg.parts.find((p: any) => p.type === "tool-refund");
  part.state = "approval-responded";
  part.approval = { id: part.approval.id, approved: true };
  return msg;
};

const storedRefundParts = async (storage: InMemoryStorageAdapter) => {
  const stored = await storage.getMessages("u", "c");
  return stored.flatMap((m: any) => m.parts ?? []).filter((p: any) => p.type === "tool-refund");
};

describe("approved tool result flush (issue #1538)", () => {
  it("persists the approved tool result even when the turn is interrupted before step 1 finishes", async () => {
    const storage = new InMemoryStorageAdapter();
    const counters = { executions: 0 };
    const agent = makeAgent(storage, counters, 200);

    await agent.generateText("refund 50", { memory });
    const msg = await approveStoredCall(storage);

    // Abort while the post-execution model call is still in flight.
    const ac = new AbortController();
    setTimeout(() => ac.abort(new Error("client disconnected")), 50);
    await agent
      .generateText([structuredClone(msg)], { memory, abortSignal: ac.signal })
      .catch((e) => e);
    expect(counters.executions).toBe(1);

    // Memory must already hold the executed result.
    const parts = await storedRefundParts(storage);
    expect(parts).toHaveLength(1);
    expect(parts[0].state).toBe("output-available");
    expect(parts[0].output).toMatchObject({ type: "json", value: { refundId: "re_1" } });

    // A client retry resending the same approval must not re-execute the tool.
    expect((await agent.generateText([structuredClone(msg)], { memory })).text).toBe(
      "Refund done.",
    );
    expect(counters.executions).toBe(1);
  }, 30000);

  it("still records the result exactly once when the turn completes normally", async () => {
    const storage = new InMemoryStorageAdapter();
    const counters = { executions: 0 };
    const agent = makeAgent(storage, counters);

    await agent.generateText("refund 50", { memory });
    const msg = await approveStoredCall(storage);
    await agent.generateText([msg], { memory });

    expect(counters.executions).toBe(1);
    const parts = await storedRefundParts(storage);
    expect(parts).toHaveLength(1);
    expect(parts[0].state).toBe("output-available");
    expect(parts[0].output).toMatchObject({ type: "json", value: { refundId: "re_1" } });

    // Resending the same approval after success must not re-execute either.
    expect((await agent.generateText([structuredClone(msg)], { memory })).text).toBe(
      "Refund done.",
    );
    expect(counters.executions).toBe(1);

    const result = await agent.generateText("did it go through?", { memory });
    expect(result.text).toBeDefined();
  }, 30000);

  it("leaves ordinary tools without needsApproval on the existing step-flush path", async () => {
    const storage = new InMemoryStorageAdapter();
    let executions = 0;
    const model = new MockLanguageModelV3({
      modelId: "test-model",
      doGenerate: async ({ prompt, abortSignal }) => {
        if (prompt.some((m: any) => m.role === "tool")) {
          await new Promise((resolve, reject) => {
            const t = setTimeout(resolve, 200);
            abortSignal?.addEventListener("abort", () => {
              clearTimeout(t);
              reject(new Error("aborted"));
            });
          });
          return {
            content: [{ type: "text" as const, text: "done" }],
            finishReason: { unified: "stop" as const, raw: "stop" },
            usage,
            warnings: [],
          };
        }
        return {
          content: [
            {
              type: "tool-call" as const,
              toolCallId: "call_1",
              toolName: "lookup",
              input: "{}",
            },
          ],
          finishReason: { unified: "tool-calls" as const, raw: "tool_use" },
          usage,
          warnings: [],
        };
      },
    });
    const agent = new Agent({
      name: "a",
      instructions: "x",
      model: model as any,
      memory: new Memory({ storage }),
      tools: [
        createTool({
          name: "lookup",
          description: "lookup",
          parameters: z.object({}),
          execute: async () => ({ n: ++executions }),
        }),
      ],
    });

    const ac = new AbortController();
    setTimeout(() => ac.abort(new Error("client disconnected")), 50);
    await agent.generateText("lookup", { memory, abortSignal: ac.signal }).catch((e) => e);
    expect(executions).toBe(1);

    // Ordinary tools are untouched by this change: the result is persisted
    // exactly once by the existing onStepFinish flush that runs right after
    // the tool completes (no model call in between), before the abort hits
    // the next step.
    const stored = await storage.getMessages("u", "c");
    const parts = stored
      .flatMap((m: any) => m.parts ?? [])
      .filter((p: any) => p.type === "tool-lookup");
    expect(parts).toHaveLength(1);
    expect(parts[0].output).toMatchObject({ type: "json", value: { n: 1 } });
  }, 30000);
});

it("persists interrupted approved results and retries successfully with contextLimit zero", async () => {
  const storage = new InMemoryStorageAdapter();
  const counters = { executions: 0 };
  const agent = makeAgent(storage, counters, 200, 0);
  await agent.generateText("refund 50", { memory });
  const msg = await approveStoredCall(storage);
  const ac = new AbortController();
  setTimeout(() => ac.abort(new Error("disconnect")), 50);
  await agent
    .generateText([structuredClone(msg)], { memory, abortSignal: ac.signal })
    .catch(() => {});
  expect((await storedRefundParts(storage))[0]).toMatchObject({ state: "output-available" });
  expect((await agent.generateText([structuredClone(msg)], { memory })).text).toBe("Refund done.");
  expect(counters.executions).toBe(1);
});

it("does not infer approval for a dynamically non-gated tool call", async () => {
  const agent = makeAgent(new InMemoryStorageAdapter(), { executions: 0 });
  const context = { systemContext: new Map() };
  const shouldPersist = vi.spyOn(agent as any, "shouldPersistMemoryForContext");
  const tool = createTool({
    name: "lookup",
    description: "lookup",
    parameters: z.object({}),
    needsApproval: async () => false,
    execute: async () => "ok",
  });
  await (agent as any).persistApprovedToolResult({
    tool,
    toolCallId: "not-approved",
    output: "ok",
    oc: context,
  });
  expect(shouldPersist).not.toHaveBeenCalled();
});
