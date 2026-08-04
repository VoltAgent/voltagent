import type { D1Database } from "@cloudflare/workers-types";
import { ConversationOwnershipMismatchError } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { D1MemoryAdapter } from "./memory-adapter";

function createMockBinding(): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn().mockReturnThis(),
      run: vi.fn().mockResolvedValue({}),
      all: vi.fn().mockResolvedValue({ results: [] }),
    })),
    batch: vi.fn().mockResolvedValue([]),
  } as unknown as D1Database;
}

describe("D1MemoryAdapter queryWorkflowRuns", () => {
  it("builds metadata filters with JSON-aware comparisons", async () => {
    vi.spyOn(D1MemoryAdapter.prototype as any, "ensureInitialized").mockResolvedValue(undefined);

    const adapter = new D1MemoryAdapter({
      binding: createMockBinding(),
      tablePrefix: "test",
    });

    const allSpy = vi.spyOn(adapter as any, "all").mockResolvedValue([
      {
        id: "exec-1",
        workflow_id: "workflow-1",
        workflow_name: "Workflow 1",
        status: "completed",
        input: '{"requestId":"req-1"}',
        context: '[["tenantId","acme"]]',
        workflow_state: '{"phase":"done"}',
        suspension: null,
        events: null,
        output: null,
        cancellation: null,
        user_id: "user-1",
        conversation_id: null,
        metadata: '{"tenantId":"acme"}',
        created_at: "2024-01-02T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
      },
    ]);

    const result = await adapter.queryWorkflowRuns({
      workflowId: "workflow-1",
      status: "completed",
      from: new Date("2024-01-01T00:00:00Z"),
      to: new Date("2024-01-03T00:00:00Z"),
      userId: "user-1",
      metadata: { tenantId: "acme" },
      limit: 5,
      offset: 2,
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.input).toEqual({ requestId: "req-1" });
    expect(result[0]?.context).toEqual([["tenantId", "acme"]]);
    expect(result[0]?.workflowState).toEqual({ phase: "done" });

    expect(allSpy).toHaveBeenCalledTimes(1);
    const [sql, args] = allSpy.mock.calls[0];

    expect(sql).toContain("workflow_id = ?");
    expect(sql).toContain("status = ?");
    expect(sql).toContain("created_at >=");
    expect(sql).toContain("user_id = ?");
    expect(sql).toContain("json_extract(metadata, ?) = json_extract(json(?), '$')");
    expect(sql).toContain("ORDER BY created_at DESC");
    expect(args).toEqual([
      "workflow-1",
      "completed",
      "2024-01-01T00:00:00.000Z",
      "2024-01-03T00:00:00.000Z",
      "user-1",
      '$."tenantId"',
      '"acme"',
      5,
      2,
    ]);
  });
});

describe("D1MemoryAdapter conversation ownership guards", () => {
  const row = {
    id: "conv-1",
    resource_id: "agent-1",
    user_id: "user-1",
    title: "Original",
    metadata: "{}",
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-01T00:00:00.000Z",
  };

  it("adds expectedUserId to updateConversation mutations", async () => {
    vi.spyOn(D1MemoryAdapter.prototype as any, "ensureInitialized").mockResolvedValue(undefined);
    const adapter = new D1MemoryAdapter({ binding: createMockBinding(), tablePrefix: "test" });
    vi.spyOn(adapter as any, "all")
      .mockResolvedValueOnce([row])
      .mockResolvedValueOnce([{ ...row, title: "Updated" }]);
    const runSpy = vi.spyOn(adapter as any, "run").mockResolvedValue({ meta: { changes: 1 } });

    await (adapter as any).updateConversation(
      "conv-1",
      { title: "Updated" },
      { expectedUserId: "user-1" },
    );

    const [sql, args] = runSpy.mock.calls[0];
    expect(sql).toContain("WHERE id = ? AND user_id = ?");
    expect(args).toEqual([expect.any(String), "Updated", "conv-1", "user-1"]);
  });

  it("rejects guarded updates before mutating when the existing owner does not match", async () => {
    vi.spyOn(D1MemoryAdapter.prototype as any, "ensureInitialized").mockResolvedValue(undefined);
    const adapter = new D1MemoryAdapter({ binding: createMockBinding(), tablePrefix: "test" });
    vi.spyOn(adapter as any, "all").mockResolvedValueOnce([{ ...row, user_id: "user-2" }]);
    const runSpy = vi.spyOn(adapter as any, "run").mockResolvedValue({ meta: { changes: 1 } });

    await expect(
      (adapter as any).updateConversation(
        "conv-1",
        { title: "Updated" },
        { expectedUserId: "user-1" },
      ),
    ).rejects.toBeInstanceOf(ConversationOwnershipMismatchError);

    expect(runSpy).not.toHaveBeenCalled();
  });

  it("uses the guarded parent delete and relies on cascades for owned child rows", async () => {
    vi.spyOn(D1MemoryAdapter.prototype as any, "ensureInitialized").mockResolvedValue(undefined);
    const adapter = new D1MemoryAdapter({ binding: createMockBinding(), tablePrefix: "test" });
    const runSpy = vi.spyOn(adapter as any, "run").mockResolvedValue({ meta: { changes: 1 } });

    await (adapter as any).deleteConversation("conv-1", { expectedUserId: "user-1" });

    expect(runSpy).toHaveBeenCalledTimes(1);
    const [sql, args] = runSpy.mock.calls[0];
    expect(sql).toContain("DELETE FROM test_conversations WHERE id = ? AND user_id = ?");
    expect(args).toEqual(["conv-1", "user-1"]);
  });

  it("rejects guarded deletes without deleting child rows when no owned row is affected", async () => {
    vi.spyOn(D1MemoryAdapter.prototype as any, "ensureInitialized").mockResolvedValue(undefined);
    const adapter = new D1MemoryAdapter({ binding: createMockBinding(), tablePrefix: "test" });
    const runSpy = vi.spyOn(adapter as any, "run").mockResolvedValue({ meta: { changes: 0 } });

    await expect(
      (adapter as any).deleteConversation("conv-1", { expectedUserId: "user-1" }),
    ).rejects.toBeInstanceOf(ConversationOwnershipMismatchError);

    expect(runSpy).toHaveBeenCalledTimes(1);
    const [sql, args] = runSpy.mock.calls[0];
    expect(sql).toContain("DELETE FROM test_conversations WHERE id = ? AND user_id = ?");
    expect(args).toEqual(["conv-1", "user-1"]);
  });
});
