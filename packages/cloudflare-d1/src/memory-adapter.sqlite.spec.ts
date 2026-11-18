import type { D1Database } from "@cloudflare/workers-types";
import { type InStatement, createClient } from "@libsql/client";
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { D1MemoryAdapter } from "./memory-adapter";

/**
 * The part of a D1 binding the adapter uses, backed by a real in-memory SQLite
 * database (D1 is SQLite), so the adapter's SQL is actually run.
 */
function createSqliteBinding(): D1Database {
  const db = createClient({ url: ":memory:" });

  const rowsOf = async (stmt: InStatement) => {
    const { columns, rows } = await db.execute(stmt);
    return rows.map((row) => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  };

  const statement = (sql: string, params: unknown[] = []) => {
    const stmt = { sql, args: params } as InStatement;
    return {
      stmt,
      bind: (...args: unknown[]) => statement(sql, args),
      async run() {
        await db.execute(stmt);
        return { success: true, meta: {} };
      },
      async all() {
        return { results: await rowsOf(stmt), success: true, meta: {} };
      },
      async first() {
        return (await rowsOf(stmt))[0] ?? null;
      },
    };
  };

  return {
    prepare: (sql: string) => statement(sql),
    async batch(statements: Array<ReturnType<typeof statement>>) {
      await db.batch(
        statements.map((s) => s.stmt),
        "write",
      );
      return [];
    },
  } as unknown as D1Database;
}

const text = (id: string, role: UIMessage["role"], value: string): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text: value }],
});

const texts = (messages: UIMessage[]) => messages.map((m) => (m.parts[0] as { text: string }).text);

describe("D1MemoryAdapter getMessages order", () => {
  async function adapterWithConversation() {
    const adapter = new D1MemoryAdapter({ binding: createSqliteBinding(), tablePrefix: "t" });
    await adapter.createConversation({
      id: "c1",
      resourceId: "agent",
      userId: "u1",
      title: "t",
      metadata: {},
    });
    return adapter;
  }

  // One turn saved with addMessages shares a single created_at. The ids are
  // deliberately not in alphabetical order.
  const turn = [
    text("q7", "user", "1 what is the weather?"),
    text("c2", "assistant", "2 calling the weather tool"),
    text("x9", "assistant", "3 tool result: sunny"),
    text("a1", "assistant", "4 it is sunny"),
  ];

  it("keeps insertion order for messages saved together", async () => {
    const adapter = await adapterWithConversation();
    await adapter.addMessages(turn, "u1", "c1");

    expect(texts(await adapter.getMessages("u1", "c1"))).toEqual([
      "1 what is the weather?",
      "2 calling the weather tool",
      "3 tool result: sunny",
      "4 it is sunny",
    ]);
  });

  it("returns the newest messages when limit cuts into one batch", async () => {
    const adapter = await adapterWithConversation();
    await adapter.addMessages(turn, "u1", "c1");

    expect(texts(await adapter.getMessages("u1", "c1", { limit: 2 }))).toEqual([
      "3 tool result: sunny",
      "4 it is sunny",
    ]);
  });
});
