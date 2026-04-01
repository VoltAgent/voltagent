import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import type { UIMessage } from "ai";
import { afterEach, describe, expect, it } from "vitest";
import { assertAssistantParts, runFiveTurns } from "./message-persistence.shared";

describe.sequential("message persistence e2e (libsql)", () => {
  let libsqlTempDir: string | undefined;

  afterEach(() => {
    if (libsqlTempDir) {
      fs.rmSync(libsqlTempDir, { recursive: true, force: true });
      libsqlTempDir = undefined;
    }
  });

  it("persists reasoning + tool + text via agent calls on libsql", async () => {
    libsqlTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "voltagent-e2e-libsql-"));
    const dbPath = path.join(libsqlTempDir, "memory.db");
    const dbUrl = `file:${dbPath}`;
    const tablePrefix = `voltagent_e2e_libsql_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const userId = `user-${randomUUID()}`;
    const conversationId = `conversation-${randomUUID()}`;

    const memory = new Memory({
      storage: new LibSQLMemoryAdapter({
        url: dbUrl,
        tablePrefix,
      }),
    });

    await runFiveTurns(memory, userId, conversationId);

    const client = createClient({ url: dbUrl });
    try {
      const conversationRows = await client.execute({
        sql: `SELECT id, user_id, resource_id FROM ${tablePrefix}_conversations WHERE id = ?`,
        args: [conversationId],
      });
      expect(conversationRows.rows).toHaveLength(1);
      expect(conversationRows.rows[0]?.id).toBe(conversationId);
      expect(conversationRows.rows[0]?.user_id).toBe(userId);
      expect(conversationRows.rows[0]?.resource_id).toBe("persistence-e2e-agent");

      const messageRows = await client.execute({
        sql: `SELECT role, parts FROM ${tablePrefix}_messages WHERE conversation_id = ? AND user_id = ? ORDER BY created_at ASC`,
        args: [conversationId, userId],
      });
      const assistantRows = messageRows.rows.filter((row) => row.role === "assistant");
      expect(assistantRows).toHaveLength(5);

      for (const [index, row] of assistantRows.entries()) {
        const rawParts = row.parts;
        if (typeof rawParts !== "string") {
          throw new Error("Expected libsql parts to be JSON string.");
        }
        const parts = JSON.parse(rawParts) as UIMessage["parts"];
        assertAssistantParts({ id: "libsql-row", role: "assistant", parts }, index + 1);
      }

      const stepCountRows = await client.execute({
        sql: `SELECT COUNT(*) AS count FROM ${tablePrefix}_steps WHERE conversation_id = ? AND user_id = ?`,
        args: [conversationId, userId],
      });
      expect(Number(stepCountRows.rows[0]?.count ?? 0)).toBeGreaterThan(0);
    } finally {
      client.close();
    }
  });
});
