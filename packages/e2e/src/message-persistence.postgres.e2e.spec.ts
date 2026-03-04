import { randomUUID } from "node:crypto";
import { Memory } from "@voltagent/core";
import { PostgreSQLMemoryAdapter } from "@voltagent/postgres";
import type { UIMessage } from "ai";
import { Pool } from "pg";
import { describe, expect, it } from "vitest";
import { assertAssistantParts, runFiveTurns } from "./message-persistence.shared";

describe.sequential("message persistence e2e (postgres)", () => {
  it("persists reasoning + tool + text via agent calls on postgres", async () => {
    const tablePrefix = `voltagent_e2e_pg_${randomUUID().replace(/-/g, "").slice(0, 8)}`;
    const userId = `user-${randomUUID()}`;
    const conversationId = `conversation-${randomUUID()}`;
    const postgresConfig = {
      host: process.env.VOLTAGENT_E2E_POSTGRES_HOST ?? "127.0.0.1",
      port: Number(process.env.VOLTAGENT_E2E_POSTGRES_PORT ?? "5433"),
      database: process.env.VOLTAGENT_E2E_POSTGRES_DB ?? "voltagent_test",
      user: process.env.VOLTAGENT_E2E_POSTGRES_USER ?? "test",
      password: process.env.VOLTAGENT_E2E_POSTGRES_PASSWORD ?? "test",
    } as const;

    const probePool = new Pool({
      ...postgresConfig,
      connectionTimeoutMillis: 2000,
      max: 1,
    });

    try {
      await probePool.query("SELECT 1");
    } catch (error) {
      throw new Error(
        `Postgres E2E requires a reachable database. Checked ${postgresConfig.host}:${postgresConfig.port}/${postgresConfig.database}.`,
        { cause: error as Error },
      );
    } finally {
      await probePool.end();
    }

    const memory = new Memory({
      storage: new PostgreSQLMemoryAdapter({
        connection: postgresConfig,
        tablePrefix,
      }),
    });

    await runFiveTurns(memory, userId, conversationId);

    const pool = new Pool(postgresConfig);

    try {
      const conversationRows = await pool.query(
        `SELECT id, user_id, resource_id FROM ${tablePrefix}_conversations WHERE id = $1`,
        [conversationId],
      );
      expect(conversationRows.rows).toHaveLength(1);
      expect(conversationRows.rows[0]?.id).toBe(conversationId);
      expect(conversationRows.rows[0]?.user_id).toBe(userId);
      expect(conversationRows.rows[0]?.resource_id).toBe("persistence-e2e-agent");

      const messageRows = await pool.query(
        `SELECT role, parts FROM ${tablePrefix}_messages WHERE conversation_id = $1 AND user_id = $2 ORDER BY created_at ASC`,
        [conversationId, userId],
      );
      const assistantRows = messageRows.rows.filter((row) => row.role === "assistant");
      expect(assistantRows).toHaveLength(5);

      for (const [index, row] of assistantRows.entries()) {
        const rawParts = row.parts;
        const parts =
          typeof rawParts === "string"
            ? (JSON.parse(rawParts) as UIMessage["parts"])
            : (rawParts as UIMessage["parts"]);
        assertAssistantParts({ id: "postgres-row", role: "assistant", parts }, index + 1);
      }

      const stepCountRows = await pool.query(
        `SELECT COUNT(*)::int AS count FROM ${tablePrefix}_steps WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId],
      );
      expect(Number(stepCountRows.rows[0]?.count ?? 0)).toBeGreaterThan(0);
    } finally {
      await pool.end();
    }
  });
});
