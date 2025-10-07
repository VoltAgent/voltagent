import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

// Shared memory instance for all agents using libsql
export const sharedMemory = new Memory({
  storage: new LibSQLMemoryAdapter({
    // Use local SQLite database file
    url: "file:./memory.db",
    // Or use libsql cloud (uncomment and configure if needed)
    // url: process.env.LIBSQL_URL || "file:./memory.db",
    // authToken: process.env.LIBSQL_AUTH_TOKEN,
  }),
});
