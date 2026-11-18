import { DatabaseSync } from "node:sqlite";
import type { D1Database } from "@cloudflare/workers-types";
import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { D1MemoryAdapter } from "./memory-adapter";

/**
 * The part of a D1 binding the adapter uses, backed by a real in-memory SQLite
 * database. Like D1, it rejects a statement with more than 100 bound
 * parameters ("too many SQL variables").
 */
function createSqliteBinding(): D1Database {
  const db = new DatabaseSync(":memory:");

  const statement = (sql: string, params: unknown[] = []) => {
    if (params.length > 100) {
      throw new Error("D1_ERROR: too many SQL variables: SQLITE_ERROR");
    }
    return {
      bind: (...args: unknown[]) => statement(sql, args),
      async run() {
        db.prepare(sql).run(...(params as never[]));
        return { success: true, meta: {} };
      },
      async all() {
        return { results: db.prepare(sql).all(...(params as never[])), success: true, meta: {} };
      },
      async first() {
        return db.prepare(sql).get(...(params as never[])) ?? null;
      },
      runSync() {
        db.prepare(sql).run(...(params as never[]));
      },
    };
  };

  return {
    prepare: (sql: string) => statement(sql),
    async batch(statements: Array<ReturnType<typeof statement>>) {
      db.exec("BEGIN");
      try {
        for (const s of statements) s.runSync();
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
      return [];
    },
  } as unknown as D1Database;
}

const message = (id: string): UIMessage => ({
  id,
  role: "user",
  parts: [{ type: "text", text: id }],
});

describe("D1MemoryAdapter deleteMessages", () => {
  async function adapterWithMessages(count: number) {
    const adapter = new D1MemoryAdapter({ binding: createSqliteBinding(), tablePrefix: "t" });
    await adapter.createConversation({
      id: "c1",
      resourceId: "agent",
      userId: "u1",
      title: "t",
      metadata: {},
    });
    const ids = Array.from({ length: count }, (_, i) => `m${i}`);
    await adapter.addMessages(ids.map(message), "u1", "c1");
    return { adapter, ids };
  }

  it.each([1, 98, 99, 250])("deletes %i messages", async (count) => {
    const { adapter, ids } = await adapterWithMessages(count + 1);

    await adapter.deleteMessages(ids.slice(0, count), "u1", "c1");

    const remaining = await adapter.getMessages("u1", "c1");
    expect(remaining.map((m) => m.id)).toEqual([`m${count}`]);
  });
});
