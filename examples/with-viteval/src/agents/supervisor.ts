import { Agent } from "@voltagent/core";
import { generalAgent } from "./general";
import { geographyAgent } from "./geography";
import { historyAgent } from "./history";
import { mathAgent } from "./math";
import { scienceAgent } from "./science";

export interface SupervisorInput {
  userQuery: string;
}

export interface SupervisorOutput {
  response: string;
  agentUsed: string;
}

export const supervisorAgent = new Agent({
  name: "supervisor-agent",
  instructions: `You are a supervisor agent that has a team of specialized agents for answering questions. Your task is to route the user query to the appropriate specialized agent and then return the response from the specialized agent to the user.

Available agents:
- general: For general questions and knowledge queries
- math: For mathematical problems and calculations
- geography: For questions about countries, cities, landmarks, and geographical features
- history: For questions about historical events, people, and places
- science: For questions about physics, chemistry, biology, and other sciences

Analyze the user query and decide which agent should handle it.
Consider the subject matter and route to the most appropriate specialized agent.
Pass the user query to the specialized agent and return the response from the specialized agent to the user.`,
  model: "openai/gpt-4o-mini",
  subAgents: [generalAgent, mathAgent, geographyAgent, historyAgent, scienceAgent],
});
