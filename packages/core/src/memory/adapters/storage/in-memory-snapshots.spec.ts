import { beforeEach, describe, expect, it } from "vitest";
import { Memory } from "../../index";
import type { ConversationStepRecord, WorkflowStateEntry } from "../../types";
import { InMemoryStorageAdapter } from "./in-memory";

const scope = ["user", "conversation"] as const;

function message(text = "saved") {
  return {
    id: "message",
    role: "user" as const,
    parts: [{ type: "text" as const, text }],
    metadata: { tags: ["saved"] },
  };
}

function step(overrides: Partial<ConversationStepRecord> = {}): ConversationStepRecord {
  return {
    id: "step",
    userId: scope[0],
    conversationId: scope[1],
    agentId: "agent",
    operationId: "operation",
    stepIndex: 1,
    type: "tool_result",
    role: "assistant",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("in-memory persistence snapshots through Memory", () => {
  let memory: Memory;

  beforeEach(async () => {
    memory = new Memory({ storage: new InMemoryStorageAdapter() });
    await memory.createConversation({
      id: scope[1],
      userId: scope[0],
      resourceId: "agent",
      title: "Test",
      metadata: {},
    });
  });

  it.each(["single", "batch"])("snapshots %s message writes", async (mode) => {
    const input = message();
    if (mode === "single") {
      await memory.addMessage(input, ...scope);
    } else {
      await memory.addMessages([input], ...scope);
    }
    input.parts[0].text = "changed after saving";
    input.metadata.tags.push("changed");

    const stored = await memory.getMessages(...scope);
    expect(stored[0].parts).toEqual([{ type: "text", text: "saved" }]);
    expect(stored[0].metadata).toMatchObject({ tags: ["saved"] });
  });

  it("snapshots replacement message payloads without duplicating the message", async () => {
    await memory.addMessage(message(), ...scope);
    const replacement = message("replacement");
    await memory.addMessage(replacement, ...scope);
    replacement.parts.push({ type: "text", text: "late mutation" });

    const stored = await memory.getMessages(...scope);
    expect(stored).toHaveLength(1);
    expect(stored[0].parts).toEqual([{ type: "text", text: "replacement" }]);
  });

  it("keeps retrieved messages and timestamps detached", async () => {
    await memory.addMessage(message(), ...scope);
    const first = await memory.getMessages(...scope);
    first[0].parts.push({ type: "text", text: "read mutation" });
    first[0].metadata?.createdAt.setTime(0);

    const next = await memory.getMessages(...scope);
    expect(next[0].parts).toEqual([{ type: "text", text: "saved" }]);
    expect(next[0].metadata?.createdAt).toBeInstanceOf(Date);
    expect(next[0].metadata?.createdAt.getTime()).not.toBe(0);
  });

  it("snapshots nested step inputs on save", async () => {
    const args = { nested: { value: "saved" } };
    const result = { items: [{ value: "saved" }] };
    const usage = { promptTokens: 1, completionTokens: 2, totalTokens: 3 };
    await memory.saveConversationSteps([step({ arguments: args, result, usage })]);
    args.nested.value = "changed";
    result.items[0].value = "changed";
    usage.totalTokens = 99;

    expect((await memory.getConversationSteps(...scope))[0]).toMatchObject({
      arguments: { nested: { value: "saved" } },
      result: { items: [{ value: "saved" }] },
      usage: { totalTokens: 3 },
    });
  });

  it("detaches nested step payloads returned to callers", async () => {
    await memory.saveConversationSteps([
      step({ arguments: { nested: { value: "saved" } }, result: { items: ["saved"] } }),
    ]);
    const first = await memory.getConversationSteps(...scope);
    (first[0].arguments?.nested as { value: string }).value = "changed";
    (first[0].result?.items as string[]).push("changed");

    expect((await memory.getConversationSteps(...scope))[0]).toMatchObject({
      arguments: { nested: { value: "saved" } },
      result: { items: ["saved"] },
    });
  });

  it("snapshots step replacements while preserving order, filtering and limits", async () => {
    await memory.saveConversationSteps([
      step({ id: "first", stepIndex: 2 }),
      step({ id: "second", stepIndex: 1, operationId: "other" }),
    ]);
    const args = { nested: { value: "replacement" } };
    await memory.saveConversationSteps([step({ id: "first", stepIndex: 3, arguments: args })]);
    args.nested.value = "changed";

    const all = await memory.getConversationSteps(...scope);
    expect(all.map((record) => record.id)).toEqual(["second", "first"]);
    const filtered = await memory.getConversationSteps(...scope, {
      operationId: "operation",
      limit: 1,
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].arguments).toEqual({ nested: { value: "replacement" } });
  });

  it("preserves shallow step isolation when a payload cannot be cloned", async () => {
    await memory.saveConversationSteps([
      step({
        arguments: { value: "saved", callback: () => "callback" },
        result: { value: "saved" },
        usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
      }),
    ]);
    const first = (await memory.getConversationSteps(...scope))[0];
    if (first.arguments) first.arguments.value = "changed";
    if (first.result) first.result.value = "changed";
    if (first.usage) first.usage.totalTokens = 99;
    const next = (await memory.getConversationSteps(...scope))[0];
    expect(next.arguments?.value).toBe("saved");
    expect(next.result?.value).toBe("saved");
    expect(next.usage?.totalTokens).toBe(3);
  });

  it("preserves null step fields and omitted usage", async () => {
    await memory.saveConversationSteps([step({ arguments: null, result: null })]);
    const stored = (await memory.getConversationSteps(...scope))[0];
    expect(stored.arguments).toBeNull();
    expect(stored.result).toBeNull();
    expect(stored.usage).toBeUndefined();
    expect(Object.hasOwn(stored, "usage")).toBe(true);
  });

  it("snapshots conversation metadata updates", async () => {
    const metadata = { nested: { value: "saved" } };
    await memory.updateConversation(scope[1], { metadata });
    metadata.nested.value = "changed";
    expect((await memory.getConversation(scope[1]))?.metadata).toEqual({
      nested: { value: "saved" },
    });
  });

  it.each([
    ["Map with callback", new Map([["callback", () => "saved"]])],
    ["array with callback", [() => "saved"]],
    [
      "service with callback",
      new (class Service {
        callback = () => "saved";
      })(),
    ],
    [
      "service with prototype method",
      new (class Service {
        read() {
          return "saved";
        }
      })(),
    ],
  ])("preserves the type of context value %s", async (_name, value) => {
    await memory.setWorkflowState("context-types", {
      id: "context-types",
      workflowId: "workflow",
      workflowName: "Test",
      status: "running",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    });
    const key = Symbol("service");
    await memory.updateWorkflowState("context-types", { context: [[key, value]] });
    const restored = await memory.getWorkflowState("context-types");
    expect(restored?.context?.[0][0]).toBe(key);
    expect(restored?.context?.[0][1]).toBe(value);
  });

  it.each(["key", Symbol("key")])("snapshots workflow updates with context key %s", async (key) => {
    const state: WorkflowStateEntry = {
      id: "execution",
      workflowId: "workflow",
      workflowName: "Test",
      status: "running",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    };
    await memory.setWorkflowState(state.id, state);
    const workflowState = { values: [1] };
    const input = { values: [2] };
    const contextValue = { value: 3 };
    const suspendedAt = new Date("2026-01-02");
    await memory.updateWorkflowState(state.id, {
      workflowState,
      input,
      context: [[key, contextValue]],
      suspension: { suspendedAt, stepIndex: 0 },
    });
    await memory.updateWorkflowState(state.id, { status: "suspended" });
    workflowState.values.push(99);
    input.values.push(99);
    contextValue.value = 99;
    suspendedAt.setTime(0);

    const stored = await memory.getWorkflowState(state.id);
    expect(stored?.workflowState).toEqual({ values: [1] });
    expect(stored?.input).toEqual({ values: [2] });
    expect(stored?.context).toEqual([[key, { value: 3 }]]);
    expect(stored?.suspension?.suspendedAt).toEqual(new Date("2026-01-02"));
  });
});
