import { VoltAgent } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { storyWriterAgent, supervisorAgent, uppercaseAgent, wordCountAgent } from "./agents";

new VoltAgent({
  agents: {
    supervisorAgent,
    storyWriterAgent,
    wordCountAgent,
    uppercaseAgent,
  },
  server: honoServer(),
});
