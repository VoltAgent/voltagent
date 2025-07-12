import type { Client } from "@libsql/client";

/**
 * Create workflow-related tables in the database
 */
export async function createWorkflowTables(
  db: Client,
  tablePrefix = "voltagent_memory",
): Promise<void> {
  console.log("[Migration] Creating workflow tables...");

  // Create workflow_history table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${tablePrefix}_workflow_history (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      workflow_id TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error', 'cancelled')),
      start_time TEXT NOT NULL,
      end_time TEXT,
      input TEXT,
      output TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for workflow_history
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_history_workflow_id ON ${tablePrefix}_workflow_history(workflow_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_history_status ON ${tablePrefix}_workflow_history(status)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_history_start_time ON ${tablePrefix}_workflow_history(start_time)`,
  );

  // Create workflow_steps table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${tablePrefix}_workflow_steps (
      id TEXT PRIMARY KEY,
      workflow_history_id TEXT NOT NULL,
      step_index INTEGER NOT NULL,
      step_type TEXT NOT NULL,
      step_name TEXT NOT NULL,
      step_id TEXT,
      status TEXT NOT NULL CHECK (status IN ('running', 'completed', 'error', 'skipped')),
      start_time TEXT NOT NULL,
      end_time TEXT,
      input TEXT,
      output TEXT,
      error_message TEXT,
      agent_execution_id TEXT,
      parallel_index INTEGER,
      parent_step_id TEXT,
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for workflow_steps
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_steps_workflow_history ON ${tablePrefix}_workflow_steps(workflow_history_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_steps_agent_execution ON ${tablePrefix}_workflow_steps(agent_execution_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_steps_step_index ON ${tablePrefix}_workflow_steps(workflow_history_id, step_index)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_steps_parallel ON ${tablePrefix}_workflow_steps(parent_step_id, parallel_index)`,
  );

  // Create workflow_timeline_events table
  await db.execute(`
    CREATE TABLE IF NOT EXISTS ${tablePrefix}_workflow_timeline_events (
      id TEXT PRIMARY KEY,
      workflow_history_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('workflow', 'workflow-step')),
      start_time TEXT NOT NULL,
      end_time TEXT,
      status TEXT NOT NULL,
      level TEXT DEFAULT 'INFO',
      input TEXT,
      output TEXT,
      status_message TEXT,
      metadata TEXT,
      trace_id TEXT,
      parent_event_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for workflow_timeline_events
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_timeline_events_workflow_history ON ${tablePrefix}_workflow_timeline_events(workflow_history_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_timeline_events_trace ON ${tablePrefix}_workflow_timeline_events(trace_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_timeline_events_parent ON ${tablePrefix}_workflow_timeline_events(parent_event_id)`,
  );
  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_${tablePrefix}_workflow_timeline_events_type ON ${tablePrefix}_workflow_timeline_events(type)`,
  );

  // Check if workflow_id column exists in agent_history table
  const checkWorkflowIdColumn = await db.execute(`
    SELECT COUNT(*) as count 
    FROM pragma_table_info('agent_history') 
    WHERE name = 'workflow_id'
  `);

  if (checkWorkflowIdColumn.rows[0].count === 0) {
    // Add workflow_id column to existing agent_history table
    await db.execute("ALTER TABLE agent_history ADD COLUMN workflow_id TEXT");
    console.log("[Migration] Added workflow_id column to agent_history table");
  }

  // Check if workflow_step_id column exists in agent_history table
  const checkWorkflowStepIdColumn = await db.execute(`
    SELECT COUNT(*) as count 
    FROM pragma_table_info('agent_history') 
    WHERE name = 'workflow_step_id'
  `);

  if (checkWorkflowStepIdColumn.rows[0].count === 0) {
    // Add workflow_step_id column to existing agent_history table
    await db.execute("ALTER TABLE agent_history ADD COLUMN workflow_step_id TEXT");
    console.log("[Migration] Added workflow_step_id column to agent_history table");
  }

  // Create indexes for new columns in agent_history
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_agent_history_workflow_id ON agent_history(workflow_id)",
  );
  await db.execute(
    "CREATE INDEX IF NOT EXISTS idx_agent_history_workflow_step ON agent_history(workflow_step_id)",
  );

  console.log("[Migration] Workflow tables created successfully!");
}

/**
 * Drop workflow-related tables (for testing purposes)
 */
export async function dropWorkflowTables(
  db: Client,
  tablePrefix = "voltagent_memory",
): Promise<void> {
  console.log("[Migration] Dropping workflow tables...");

  // Drop tables in reverse order due to foreign key constraints
  await db.execute(`DROP TABLE IF EXISTS ${tablePrefix}_workflow_timeline_events`);
  await db.execute(`DROP TABLE IF EXISTS ${tablePrefix}_workflow_steps`);
  await db.execute(`DROP TABLE IF EXISTS ${tablePrefix}_workflow_history`);

  console.log("[Migration] Workflow tables dropped successfully!");
}

/**
 * Reset workflow tables (drop and recreate)
 */
export async function resetWorkflowTables(
  db: Client,
  tablePrefix = "voltagent_memory",
): Promise<void> {
  console.log("[Migration] Resetting workflow tables...");

  await dropWorkflowTables(db, tablePrefix);
  await createWorkflowTables(db, tablePrefix);

  console.log("[Migration] Workflow tables reset successfully!");
}
