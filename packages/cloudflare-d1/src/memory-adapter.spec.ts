import type { D1Database } from "@cloudflare/workers-types";
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
