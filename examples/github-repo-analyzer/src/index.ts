import { VoltAgent, Agent, createHooks } from "@voltagent/core";
import type { OperationContext } from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { openai } from "@ai-sdk/openai";
import { fetchRepoContributorsTool, fetchRepoStarsTool } from "./tools";

// Define a type for our user context for better type safety
interface MyUserContext {
  correlationId?: string;
  userId?: string;
  someOtherData?: any;
}

// Create the stars fetcher agent
const starsFetcherAgent = new Agent({
  name: "Stars Fetcher",
  description: "Fetches the number of stars for a GitHub repository using the GitHub API",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [fetchRepoStarsTool],
  hooks: createHooks({
    onStart: async ({
      agent,
      context,
    }: { agent: Agent<any>; context: OperationContext<MyUserContext> }) => {
      console.log(`
--- StarsFetcherAgent (${agent.id}) onStart ---`);
      console.log("  Received userContext:", JSON.stringify(context.userContext, null, 2));
      if (context.userContext?.correlationId) {
        console.log("  >>> Correlation ID from supervisor:", context.userContext.correlationId);
      }
      if (context.userContext?.userId) {
        console.log("  >>> User ID from supervisor:", context.userContext.userId);
      }
      console.log("---");
    },
  }),
});

// Create the contributors fetcher agent
const contributorsFetcherAgent = new Agent({
  name: "Contributors Fetcher",
  description: "Fetches the list of contributors for a GitHub repository using the GitHub API",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [fetchRepoContributorsTool],
  hooks: createHooks({
    onStart: async ({
      agent,
      context,
    }: { agent: Agent<any>; context: OperationContext<MyUserContext> }) => {
      console.log(`
--- ContributorsFetcherAgent (${agent.id}) onStart ---`);
      console.log("  Received userContext:", JSON.stringify(context.userContext, null, 2));
      if (context.userContext?.correlationId) {
        console.log("  >>> Correlation ID from supervisor:", context.userContext.correlationId);
      }
      console.log("---");
    },
  }),
});

// Create the analyzer agent
const analyzerAgent = new Agent({
  name: "Repo Analyzer",
  description: "Analyzes repository statistics and provides insights",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  hooks: createHooks({
    onStart: async ({
      agent,
      context,
    }: { agent: Agent<any>; context: OperationContext<MyUserContext> }) => {
      console.log(`
--- RepoAnalyzerAgent (${agent.id}) onStart ---`);
      console.log("  Received userContext:", JSON.stringify(context.userContext, null, 2));
      if (context.userContext?.correlationId) {
        console.log("  >>> Correlation ID from supervisor:", context.userContext.correlationId);
      }
      console.log("---");
    },
  }),
});

// Create the supervisor agent that coordinates all the sub-agents
const supervisorAgent = new Agent({
  name: "Supervisor",
  description: `You are a GitHub repository analyzer. When given a GitHub repository URL or owner/repo format, you will:
1. Use the StarsFetcher agent to get the repository's star count
2. Use the ContributorsFetcher agent to get the repository's contributors
3. Use the RepoAnalyzer agent to analyze this data and provide insights

Example input: https://github.com/vercel/ai-sdk or vercel/ai-sdk
`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  subAgents: [starsFetcherAgent, contributorsFetcherAgent, analyzerAgent],
});

// Initialize the VoltAgent with the agent hierarchy
new VoltAgent({
  agents: {
    supervisorAgent,
  },
});

// --- Example Usage of Context Passing ---
async function main() {
  console.log("\nStarting GitHub Repo Analyzer example with context passing...");

  const repoUrl = "voltagent/core"; // Example repository
  const initialContext: MyUserContext = {
    correlationId: `corr-${Date.now()}`,
    userId: "user-example-123",
    someOtherData: { info: "Passed from main execution" },
  };

  try {
    console.log(`
Attempting to analyze repo: ${repoUrl}`);
    console.log(
      "Initial context being passed to supervisor:",
      JSON.stringify(initialContext, null, 2),
    );

    // Pass the generic type MyUserContext to generateText
    const response = await supervisorAgent.generateText<MyUserContext>(
      `Analyze the GitHub repository: ${repoUrl}`,
      {
        initialUserContext: initialContext,
      },
    );

    console.log("\n--- Supervisor Agent Final Response ---");
    console.log(response.text);
    console.log("---");
  } catch (error) {
    console.error("\nError during example execution:", error);
  }
}

main();
