import { createClient } from "@libsql/client";

// Initialize LibSQL client
const db = createClient({
  url: "file:local.db", // Use a local file
});

// Function to ensure the database table exists
export async function setupDatabase() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS user_connections (
      entity_id TEXT PRIMARY KEY,
      connected_account_id TEXT NOT NULL
    );
  `);
  console.log("Database table ensured.");
}

// Function to save or update a user's connection
export async function saveUserConnection(
  userId: string,
  connectedAccountId: string,
): Promise<void> {
  await db.execute({
    sql: "INSERT OR REPLACE INTO user_connections (entity_id, connected_account_id) VALUES (?, ?)",
    args: [userId, connectedAccountId],
  });
  console.log(`Saved connection details for ${userId} to database.`);
}

// Function to retrieve a user's connection ID
export async function getUserConnection(userId: string): Promise<string | null> {
  const rs = await db.execute({
    sql: "SELECT connected_account_id FROM user_connections WHERE entity_id = ?",
    args: [userId],
  });

  if (rs.rows.length > 0 && rs.rows[0].connected_account_id) {
    return rs.rows[0].connected_account_id as string;
  }
  return null;
}

// Export the raw client if needed elsewhere, though functions are preferred
export { db };
