import type { Client } from "@libsql/client";

/**
 * Migration to add 'suspended' status to workflow_history table
 */
export async function addSuspendedStatusMigration(
  db: Client,
  tablePrefix = "voltagent_memory",
): Promise<void> {
  // First, check if migration is already applied
  const migrationName = "add_suspended_status_to_workflow_history";

  // Create migrations table if it doesn't exist
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${tablePrefix}_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Check if this migration has already been applied
  const result = await db.execute({
    sql: `SELECT * FROM ${tablePrefix}_migrations WHERE name = ?`,
    args: [migrationName],
  });

  if (result.rows.length > 0) {
    return;
  }

  try {
    // Since SQLite doesn't support modifying CHECK constraints directly,
    // we need to recreate the table. But first, let's check if it's needed
    const needsMigration = await checkIfSuspendedStatusNeeded(db, tablePrefix);

    if (!needsMigration) {
    } else {
      // Perform the actual migration
      await performSuspendedStatusMigration(db, tablePrefix);
    }

    // Mark migration as applied
    await db.execute({
      sql: `INSERT INTO ${tablePrefix}_migrations (name) VALUES (?)`,
      args: [migrationName],
    });
  } catch (error) {
    console.error(`[Migration] Failed to apply '${migrationName}':`, error);
    throw error;
  }
}

async function checkIfSuspendedStatusNeeded(db: Client, tablePrefix: string): Promise<boolean> {
  try {
    // Try to insert a test record with 'suspended' status
    const testId = `test-suspended-check-${Date.now()}`;

    await db.execute({
      sql: `
        INSERT INTO ${tablePrefix}_workflow_history 
        (id, name, workflow_id, status, start_time) 
        VALUES (?, 'test', 'test', 'suspended', datetime('now'))
      `,
      args: [testId],
    });

    // If successful, delete the test record
    await db.execute({
      sql: `DELETE FROM ${tablePrefix}_workflow_history WHERE id = ?`,
      args: [testId],
    });

    return false; // Migration not needed
  } catch (error: any) {
    if (error.message?.includes("CHECK constraint failed")) {
      return true; // Migration needed
    }
    throw error; // Re-throw other errors
  }
}

async function performSuspendedStatusMigration(db: Client, tablePrefix: string): Promise<void> {
  // Start a transaction
  await db.execute("BEGIN TRANSACTION");

  try {
    // 1. Create a temporary table with the new schema
    await db.execute(`
      CREATE TABLE ${tablePrefix}_workflow_history_temp (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        workflow_id TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error', 'cancelled', 'suspended')),
        start_time TEXT NOT NULL,
        end_time TEXT,
        input TEXT,
        output TEXT,
        user_id TEXT,
        conversation_id TEXT,
        metadata TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Copy data from the old table
    await db.execute(`
      INSERT INTO ${tablePrefix}_workflow_history_temp 
      SELECT * FROM ${tablePrefix}_workflow_history
    `);

    // 3. Drop the old table
    await db.execute(`DROP TABLE ${tablePrefix}_workflow_history`);

    // 4. Rename the temp table
    await db.execute(`
      ALTER TABLE ${tablePrefix}_workflow_history_temp 
      RENAME TO ${tablePrefix}_workflow_history
    `);

    // 5. Recreate indexes
    await db.execute(
      `CREATE INDEX idx_${tablePrefix}_workflow_history_workflow_id ON ${tablePrefix}_workflow_history(workflow_id)`,
    );
    await db.execute(
      `CREATE INDEX idx_${tablePrefix}_workflow_history_status ON ${tablePrefix}_workflow_history(status)`,
    );
    await db.execute(
      `CREATE INDEX idx_${tablePrefix}_workflow_history_start_time ON ${tablePrefix}_workflow_history(start_time)`,
    );
    await db.execute(
      `CREATE INDEX idx_${tablePrefix}_workflow_history_user_id ON ${tablePrefix}_workflow_history(user_id)`,
    );
    await db.execute(
      `CREATE INDEX idx_${tablePrefix}_workflow_history_conversation_id ON ${tablePrefix}_workflow_history(conversation_id)`,
    );

    // Commit the transaction
    await db.execute("COMMIT");
  } catch (error) {
    // Rollback on error
    await db.execute("ROLLBACK");
    throw error;
  }
}

/**
 * Get all applied migrations
 */
export async function getAppliedMigrations(
  db: Client,
  tablePrefix = "voltagent_memory",
): Promise<Array<{ name: string; applied_at: string }>> {
  // Ensure migrations table exists
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${tablePrefix}_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const result = await db.execute(`
    SELECT name, applied_at FROM ${tablePrefix}_migrations 
    ORDER BY applied_at DESC
  `);

  return result.rows.map((row) => ({
    name: row.name as string,
    applied_at: row.applied_at as string,
  }));
}
