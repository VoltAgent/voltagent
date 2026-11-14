/**
 * Regression tests for https://github.com/VoltAgent/voltagent/issues/1535
 *
 * After a `needsApproval` tool call is approved and runs, memory must store
 * the tool part as `state: "output-available"` WITH `approval.approved`
 * preserved. Previously the buffer was seeded only from stored memory (which
 * still held the pre-approval part, `approval: { id }`), the approval
 * response in the input never reached the buffer, and the flush overwrote
 * the input message - so the stored part lost `approved: true` and every
 * later `generateText` on the conversation threw AI_TypeValidationError.
 */
import { MockLanguageModelV3 } from "ai/test";
import { describe, expect, it } from "vitest";
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

const makeAgent = (storage: InMemoryStorageAdapter, contextLimit?: number) => {
  const model = new MockLanguageModelV3({
    modelId: "test-model",
    doGenerate: async ({ prompt }) => {
      await new Promise((r) => setTimeout(r, 1));
      return prompt.some((m: any) => m.role === "tool")
        ? {
            content: [{ type: "text" as const, text: "Refund done." }],
            finishReason: { unified: "stop" as const, raw: "stop" },
            usage,
            warnings: [],
          }
        : {
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
        execute: async () => ({ refunded: true }),
      }),
    ],
  });
};

const memory = { userId: "u", conversationId: "c" };

const storedToolParts = async (storage: InMemoryStorageAdapter) => {
  const stored = await storage.getMessages("u", "c");
  return stored.flatMap((m: any) => m.parts ?? []).filter((p: any) => p.type === "tool-refund");
};

describe("needsApproval persistence (issue #1535)", () => {
  it("keeps approval.approved when an approved tool's result is persisted, and later turns work", async () => {
    const storage = new InMemoryStorageAdapter();
    const agent = makeAgent(storage);

    // Turn 1: model calls the tool, agent asks for approval.
    await agent.generateText("refund 50", { memory });

    const stored1 = await storage.getMessages("u", "c");
    const msg = structuredClone(stored1.at(-1)) as any;
    const part = msg.parts.find((p: any) => p.type === "tool-refund");
    expect(part.state).toBe("approval-requested");

    // Client approves (shape produced by the AI SDK's addToolApprovalResponse).
    part.state = "approval-responded";
    part.approval = { id: part.approval.id, approved: true };

    // Turn 2: tool runs.
    await agent.generateText([msg], { memory });

    const parts2 = await storedToolParts(storage);
    expect(parts2).toHaveLength(1);
    expect(parts2[0].state).toBe("output-available");
    expect(parts2[0].output).toBeDefined();
    expect(parts2[0].approval).toMatchObject({ approved: true });

    // Turn 3: a plain follow-up must not fail AI SDK UI message validation.
    const result = await agent.generateText("did it go through?", { memory });
    expect(result.text).toBe("Refund done.");
  }, 30000);

  it("keeps approval.approved === false when the client denies the tool", async () => {
    const storage = new InMemoryStorageAdapter();
    const agent = makeAgent(storage);

    await agent.generateText("refund 50", { memory });

    const stored1 = await storage.getMessages("u", "c");
    const msg = structuredClone(stored1.at(-1)) as any;
    const part = msg.parts.find((p: any) => p.type === "tool-refund");

    // Client denies.
    part.state = "approval-responded";
    part.approval = { id: part.approval.id, approved: false };

    await agent.generateText([msg], { memory });

    const parts2 = await storedToolParts(storage);
    expect(parts2).toHaveLength(1);
    // The client's denial decision is preserved, never rewritten to an approval.
    expect(parts2[0].approval?.approved).toBe(false);
  }, 30000);
});

it("keeps approval evidence when memory context is omitted", async () => {
  const storage = new InMemoryStorageAdapter();
  const agent = makeAgent(storage, 0);
  await agent.generateText("refund 50", { memory });
  const stored = await storage.getMessages("u", "c");
  const message = structuredClone(stored.at(-1)) as any;
  const part = message.parts.find((p: any) => p.type === "tool-refund");
  part.state = "approval-responded";
  part.approval.approved = true;
  await agent.generateText([message], { memory });
  const parts = await storedToolParts(storage);
  expect(parts[0]).toMatchObject({ state: "output-available", approval: { approved: true } });
});
