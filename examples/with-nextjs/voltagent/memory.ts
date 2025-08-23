import { InMemoryStorage } from "@voltagent/core";

// Shared memory instance - all agents and APIs will use the same instance
export const sharedMemory = new InMemoryStorage({
  debug: true,
  storageLimit: 100,
});
