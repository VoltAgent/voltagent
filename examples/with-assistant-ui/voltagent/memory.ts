import { Memory } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";

// Shared memory instance used by the assistant runtime
export const sharedMemory = new Memory({
  storage: new LibSQLMemoryAdapter({}),
});
