import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

// Shared memory instance - all agents and APIs will use the same instance
export const sharedMemory = new Memory({
  storage: new LibSQLMemoryAdapter({}),
});
