import type { Agent } from "@voltagent/core";
import type { AgentCard, AgentCardSkill } from "../types";

export interface AgentCardOptions {
  url: string;
  provider?: AgentCard["provider"];
  version: string;
  description?: string;
  capabilities?: Partial<AgentCard["capabilities"]>;
}

export function buildAgentCard(agent: Agent, options: AgentCardOptions): AgentCard {
  const skills: AgentCardSkill[] = (agent.getTools?.() ?? []).map((tool) => ({
    id: tool.id ?? tool.name,
    name: tool.name,
    description: tool.description,
    tags: ["tool"],
  }));

  return {
    name: agent.id ?? agent.name,
    description: options.description ?? agent.purpose,
    url: options.url,
    provider: options.provider,
    version: options.version,
    capabilities: {
      streaming: true,
      pushNotifications: false,
      stateTransitionHistory: false,
      ...(options.capabilities ?? {}),
    },
    defaultInputModes: ["text"],
    defaultOutputModes: ["text"],
    skills,
  };
}
