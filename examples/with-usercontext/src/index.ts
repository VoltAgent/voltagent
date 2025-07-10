import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createUserContext } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { SearchClient } from "./client";
import { searchTool } from "./tools";

// Use module augmentation to add a user context data type
// @see https://www.typescriptlang.org/docs/handbook/declaration-merging.html#module-augmentation
declare module "@voltagent/core" {
  interface UserContextData {
    searchClient: SearchClient;
  }
}

// Create the agent with tools
const agent = new Agent({
  name: "Assistant with Tools",
  description:
    "A helpful assistant that can use tools to search the web and provide better answers",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [searchTool],
});

// Initialize the VoltAgent
new VoltAgent({
  agents: {
    agent,
  },
});

// Define the main function with a user context
async function main() {
  const result = await agent.generateText("What is the capital of France?", {
    userContext: createUserContext({
      searchClient: new SearchClient(),
    }),
  });

  console.log(result);
}

// Run the main function
main().catch(console.error);
