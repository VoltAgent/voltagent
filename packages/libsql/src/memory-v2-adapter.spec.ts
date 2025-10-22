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
