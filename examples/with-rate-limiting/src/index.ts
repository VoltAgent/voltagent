/**
 * Example: Rate Limiting in VoltAgent
 *
 * This example demonstrates how to use the rate limiting feature
 * to control the frequency of LLM calls and tool executions.
 */
import "dotenv/config";
import { google } from "@ai-sdk/google";
import { Agent, RateLimitExceededError, createTool } from "@voltagent/core";
import { z } from "zod";

// Create a simple search tool
const searchTool = createTool({
  name: "search_tool",
  description: "Search for information",
  parameters: z.object({
    query: z.string().describe("Search query"),
  }),
  execute: async ({ query }) => {
    console.log(`[TOOL] Searching for: ${query}`);
    return `Search results for: ${query}`;
  },
});

// Example 1: Basic LLM Rate Limiting
async function example1_basicLLMRateLimit() {
  console.log("\n=== Example 1: Basic LLM Rate Limiting ===");

  const agent = new Agent({
    name: "basic-llm-limited-agent",
    model: google("gemini-2.0-flash-exp"),
    instructions: "You are a helpful assistant.",
    rateLimits: {
      llm: {
        maxRequestsPerMinute: 3, // Only 3 requests per minute
        strategy: "fixed_window",
        onExceeded: "throw", // Throw error when limit exceeded
      },
    },
  });

  try {
    // These will work fine
    for (let i = 1; i <= 3; i++) {
      console.log(`Request ${i}/3...`);
      const response = await agent.generateText(`Say "Hello ${i}"`);
      console.log(`✓ Response: ${response.text}`);
    }

    // This 4th request will throw RateLimitExceededError
    console.log("\nAttempting 4th request (will fail)...");
    await agent.generateText("Say Hello 4");
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      console.error(`✗ Rate limit exceeded: ${error.message}`);
      console.log(`  Remaining: ${error.stats.remaining}`);
      console.log(`  Reset at: ${error.stats.resetAt}`);
      console.log(`  Retry after: ${error.retryAfter} seconds`);
    } else if (error instanceof Error) {
      console.error(`✗ Unexpected error: ${error.message}`);
    }
  }
}

// Example 2: Delay Strategy
async function example2_delayStrategy() {
  console.log("\n=== Example 2: Delay Strategy (Auto-wait) ===");

  const agent = new Agent({
    name: "delay-agent",
    model: google("gemini-2.0-flash-exp"),
    instructions: "You are a helpful assistant.",
    rateLimits: {
      llm: {
        maxRequestsPerMinute: 2,
        strategy: "fixed_window",
        onExceeded: "delay", // Wait until rate limit resets
      },
    },
  });

  console.log("Making 3 requests (2 will go through, 3rd will wait)...");
  const startTime = Date.now();

  for (let i = 1; i <= 3; i++) {
    const requestStart = Date.now();
    console.log(`\nRequest ${i}/3 at +${Math.round((requestStart - startTime) / 1000)}s`);

    const response = await agent.generateText(`Count to ${i}`);

    const requestEnd = Date.now();
    console.log(`✓ Completed in ${Math.round((requestEnd - requestStart) / 1000)}s`);
    console.log(`  Response: ${response.text.substring(0, 50)}...`);
  }
}

// Example 3: Provider-Specific Rate Limiting
async function example3_providerSpecificLimits() {
  console.log("\n=== Example 3: Provider-Specific Rate Limiting ===");

  const agent = new Agent({
    name: "provider-limited-agent",
    model: google("gemini-2.0-flash-exp"),
    instructions: "You are a helpful assistant.",
    rateLimits: {
      llm: {
        maxRequestsPerMinute: 10, // Global limit: 10 requests/min
        onExceeded: "throw",
      },
      providers: {
        google: {
          maxRequestsPerMinute: 3, // Google-specific: 3 requests/min
          onExceeded: "throw",
        },
      },
    },
  });

  try {
    console.log("Provider-specific limit (Google): 3 requests/min");
    console.log("Global limit: 10 requests/min\n");

    for (let i = 1; i <= 4; i++) {
      console.log(`Google request ${i}/4...`);
      await agent.generateText(`Hello ${i}`);
      console.log("✓ Success");
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`✗ Google rate limit exceeded (3/min): ${error.message}`);
    }
  }
}

// Example 4: Tool-Specific Rate Limiting
async function example4_toolRateLimiting() {
  console.log("\n=== Example 4: Tool-Specific Rate Limiting ===");

  const agent = new Agent({
    name: "tool-limited-agent",
    model: google("gemini-2.0-flash-exp"),
    instructions: "You are a helpful assistant with access to a search tool.",
    tools: [searchTool],
    rateLimits: {
      tools: {
        search_tool: {
          maxRequestsPerMinute: 2, // Only 2 searches per minute
          strategy: "fixed_window",
          onExceeded: "throw",
        },
      },
    },
  });

  try {
    console.log("Asking agent to make 3 searches (limit: 2/min)...\n");

    const response = await agent.generateText(
      "Search for 'AI', then 'ML', then 'DL'. Use the search tool for each.",
    );

    console.log("\n✓ Response:", response.text);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`✗ Tool rate limit exceeded: ${error.message}`);
    }
  }
}

// Example 5: Combined Rate Limiting
async function example5_combinedLimits() {
  console.log("\n=== Example 5: Combined LLM + Tool Rate Limiting ===");

  const agent = new Agent({
    name: "fully-limited-agent",
    model: google("gemini-2.0-flash-exp"),
    instructions: "You are a helpful assistant.",
    tools: [searchTool],
    rateLimits: {
      llm: {
        maxRequestsPerMinute: 5,
        onExceeded: "delay",
      },
      tools: {
        search_tool: {
          maxRequestsPerMinute: 3,
          onExceeded: "delay",
        },
      },
      providers: {
        google: {
          maxRequestsPerMinute: 4,
          onExceeded: "throw",
        },
      },
    },
  });

  console.log("Configuration:");
  console.log("  - Google provider: 4 req/min (throw)");
  console.log("  - Global LLM: 5 req/min (delay)");
  console.log("  - Search tool: 3 req/min (delay)\n");

  // Agent will respect all limits with appropriate strategies
  try {
    const response = await agent.generateText(
      "Tell me about AI and use the search tool if needed.",
    );
    console.log("✓ Response:", `${response.text.substring(0, 100)}...`);
  } catch (error) {
    if (error instanceof Error) {
      console.error("✗ Error:", error.message);
    }
  }
}

// Example 6: Monitoring Rate Limit Stats
async function example6_monitoringStats() {
  console.log("\n=== Example 6: Monitoring Rate Limit Statistics ===");

  const agent = new Agent({
    name: "monitored-agent",
    model: google("gemini-2.0-flash-exp"),
    instructions: "You are a helpful assistant.",
    rateLimits: {
      llm: {
        maxRequestsPerMinute: 5,
        onExceeded: "throw",
      },
    },
  });

  // Make some requests
  for (let i = 1; i <= 3; i++) {
    await agent.generateText(`Request ${i}`);
  }

  console.log("\nNote: Rate limit statistics are internal to the agent.");
  console.log("In production, you can track rate limit errors and retryAfter values.");
  console.log("The RateLimitExceededError provides all necessary information for monitoring.");
}

// Run all examples
async function main() {
  console.log("🚀 VoltAgent Rate Limiting Examples\n");
  console.log("=".repeat(60));

  try {
    // Uncomment the examples you want to run:

    // await example1_basicLLMRateLimit();
    // await example2_delayStrategy();
    // await example3_providerSpecificLimits();
    // await example4_toolRateLimiting();
    // await example5_combinedLimits();
    // await example6_monitoringStats();

    console.log(`\n${"=".repeat(60)}`);
    console.log("\n✓ All examples completed!");
    console.log("\nNote: Uncomment examples in main() to run them.");
  } catch (error) {
    console.error("\n✗ Error:", error);
  }
}

// Run if executed directly
main().catch(console.error);

export {
  example1_basicLLMRateLimit,
  example2_delayStrategy,
  example3_providerSpecificLimits,
  example4_toolRateLimiting,
  example5_combinedLimits,
  example6_monitoringStats,
};
