import { AgentRegistry } from "../registries/agent-registry";
import type { VoltOpsClient } from "./client";

export const getGlobalVoltOpsClient = (): VoltOpsClient | undefined =>
  AgentRegistry.getInstance().getGlobalVoltOpsClient();
