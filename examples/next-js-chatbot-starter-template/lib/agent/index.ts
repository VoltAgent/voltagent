/**
 * Agent Configuration Exports
 *
 * Central export point for agent-related configurations.
 * Implements singleton pattern for VoltAgent to enable VoltOps console debugging.
 */

import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { chatbotAgent } from "./agent";

// Type declaration for global augmentation
declare global {
  var voltAgentInstance: VoltAgent | undefined;
}

/**
 * Singleton VoltAgent instance getter
 *
 * Creates a single VoltAgent instance with the Hono server for VoltOps console debugging.
 * The singleton pattern ensures the debugging port (3141) is properly opened and maintained
 * across hot reloads in Next.js development mode.
 *
 * @returns {VoltAgent} The singleton VoltAgent instance
 */
function getVoltAgentInstance() {
  if (!globalThis.voltAgentInstance) {
    globalThis.voltAgentInstance = new VoltAgent({
      agents: {
        chatbotAgent,
      },
      server: honoServer(),
    });
  }
  return globalThis.voltAgentInstance;
}

// Initialize the singleton
export const voltAgent = getVoltAgentInstance();

// Export individual components
export { chatbotAgent } from "./agent";
export { sharedMemory } from "./memory";
