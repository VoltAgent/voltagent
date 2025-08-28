import { InMemoryStorage } from "@voltagent/core";
import { LibSQLStorage } from "@voltagent/libsql";

// Shared memory instance - all agents and APIs will use the same instance
export const sharedMemory = new LibSQLStorage({
  debug: true,
  storageLimit: 100,
});
