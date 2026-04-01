import { NodeFilesystemBackend, PlanAgent } from "@voltagent/core";
import { sharedMemory } from "./memory";
import { internetSearch } from "./tools";

const researchInstructions = [
  "You are an expert researcher. Your job is to conduct thorough research and then write a polished report.",
  "",
  "You have access to an internet search tool as your primary means of gathering information.",
  "",
  "## internet_search",
  "Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.",
].join("\n");

export const agent = new PlanAgent({
  name: "deep-research-agent",
  systemPrompt: researchInstructions,
  model: "openai/gpt-4o-mini",
  tools: [internetSearch],
  memory: sharedMemory,
  maxSteps: 100,
  summarization: {
    triggerTokens: 1200,
    keepMessages: 6,
    maxOutputTokens: 600,
  },
  filesystem: {
    backend: new NodeFilesystemBackend({
      rootDir: process.cwd(),
      virtualMode: true,
    }),
  },
});
