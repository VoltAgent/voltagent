import { InMemoryStorageAdapter, Memory } from "@voltagent/core";
// import { LibSQLMemoryAdapter } from "@voltagent/libsql";

/**
 * Shared Memory Configuration
 *
 * Uses in-memory storage for conversation history (simple and reliable).
 * All agents share the same memory instance to maintain context.
 *
 * Note: In-memory storage is cleared when the server restarts.
 * For persistent storage, uncomment the LibSQL adapter below.
 */
export const sharedMemory = new Memory({
  storage: new InMemoryStorageAdapter(),
});

/**
 * Alternative: Persistent storage with LibSQL
 *
 * Uncomment this configuration to use persistent storage:
 *
 * export const sharedMemory = new Memory({
 *   storage: new LibSQLMemoryAdapter({
 *     url: "file:./.voltagent/memory.db",
 *   }),
 * });
 */
