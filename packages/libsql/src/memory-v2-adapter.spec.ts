/**
 * Unit tests for LibSQL Memory Storage Adapter (V2)
 * Tests query shapes with mocked client
 */

import type { UIMessage } from "ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LibSQLMemoryAdapter } from "./memory-v2-adapter";

// Mock the libsql client module
vi.mock("@libsql/client", () => ({
  createClient: vi.fn(),
}));

describe.sequential("LibSQLMemoryAdapter - Advanced Behavior", () => {
  let adapter: LibSQLMemoryAdapter;
  let mockExecute: ReturnType<typeof vi.fn>;
  let mockBatch: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock libsql client
    mockExecute = vi.fn();
    mockBatch = vi.fn();

    const { createClient } = await import("@libsql/client");
    vi.mocked(createClient).mockReturnValue({
      execute: mockExecute,
      batch: mockBatch,
    } as any);

    // Bypass heavy initialize (PRAGMA + schema)
    vi.spyOn(LibSQLMemoryAdapter.prototype as any, "initialize").mockResolvedValue(undefined);

    adapter = new LibSQLMemoryAdapter({ tablePrefix: "test" });
  });

  afterEach(async () => {
    // No explicit close required for mocked client
  });

  it("should query workflow runs with filters and pagination", async () => {
    mockExecute.mockResolvedValueOnce({
      rows: [
        {
          id: "exec-1",
          workflow_id: "workflow-1",
          workflow_name: "Workflow 1",
          status: "completed",
          suspension: null,
          events: null,
          output: null,
          cancellation: null,
          user_id: null,
          conversation_id: null,
          metadata: null,
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ],
    });

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
    expect(mockExecute).toHaveBeenCalledTimes(1);
    const { sql, args } = mockExecute.mock.calls[0][0];
    expect(sql).toContain("workflow_id = ?");
    expect(sql).toContain("status = ?");
    expect(sql).toContain("created_at >=");
    expect(sql).toContain("user_id = ?");
    expect(sql).toContain("json_extract(metadata, ?) = json(?)");
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

  it("should apply roles and time filters when getting messages", async () => {
    const before = new Date("2020-02-02T00:00:00.000Z");
    const after = new Date("2020-01-01T00:00:00.000Z");
    const roles = ["user", "assistant"] as const;

    // SELECT messages returns empty
    mockExecute.mockResolvedValueOnce({ rows: [] });

    await adapter.getMessages("user-1", "conv-1", {
      roles: roles as any,
      before,
      after,
      limit: 5,
    });

    const last = mockExecute.mock.calls.at(-1)?.[0];
    const sql: string = last.sql;
    const args: any[] = last.args;
    expect(sql).toContain("FROM test_messages");
    expect(sql).toContain("WHERE conversation_id = ? AND user_id = ?");
    expect(sql).toContain("AND role IN (?,?)");
    expect(sql).toContain("AND created_at < ?");
    expect(sql).toContain("AND created_at > ?");
    expect(sql).toContain("ORDER BY created_at ASC");
    expect(sql).toContain("LIMIT ?");
    expect(args).toEqual([
      "conv-1",
      "user-1",
      "user",
      "assistant",
      before.toISOString(),
      after.toISOString(),
      5,
    ]);
  });
});
