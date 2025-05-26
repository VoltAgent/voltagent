import { openai } from "@ai-sdk/openai";
import { type CoreMessage, streamText, generateText, generateObject } from "ai";
import { VoltAgentExporter } from "@voltagent/vercel-ai-exporter";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { z } from "zod";
import * as readline from "node:readline";
import { randomUUID } from "node:crypto";
// import { LangfuseExporter } from "langfuse-vercel";

// Initialize VoltAgent exporter
const voltAgentExporter = new VoltAgentExporter({
  publicKey: "pk_637e4c899b48bcddd85968766fd7e84b",
  secretKey: "sk_live_13450b23f364ebeb48543281023942d591e96c284f2aec562f09d2264ca516da",
  baseUrl: "http://localhost:3003",
  debug: true,
});

// Set up OpenTelemetry SDK
const sdk = new NodeSDK({
  traceExporter: voltAgentExporter,
  instrumentations: [getNodeAutoInstrumentations()],
});

// Alternative: Use LangfuseExporter instead
/* const sdk = new NodeSDK({
  traceExporter: new LangfuseExporter({
    secretKey: "sk-lf-bbb37ba1-451f-4e12-a5b1-2b8255cb2d8a",
    publicKey: "pk-lf-c63c246b-88f6-456e-92b2-41b19d8088a2",
    baseUrl: "https://cloud.langfuse.com",
  }),
  instrumentations: [getNodeAutoInstrumentations()],
}); */

sdk.start();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Scenario 1: Simple chat
async function runSimpleChat() {
  console.log("\n🤖 Starting Simple Chat Scenario...\n");

  const messages: CoreMessage[] = [
    { role: "user", content: "Hello, how are you today?" },
    { role: "user", content: "What's the weather like in Tokyo?" },
  ];

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
    tools: {
      weather: {
        description: "Get the weather in a location",
        parameters: z.object({
          location: z.string().describe("The location to get the weather for"),
        }),
        execute: async ({ location }) => {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          return {
            location,
            temperature: 72 + Math.floor(Math.random() * 21) - 10,
          };
        },
      },
    },
    maxSteps: 5,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        agentId: "chat-agent",
        userId: "demo-user",
        conversationId: "simple-chat-session",
        tags: ["simple", "weather"],
      },
    },
  });

  process.stdout.write("Assistant: ");
  for await (const delta of result.textStream) {
    process.stdout.write(delta);
  }
  process.stdout.write("\n\n");
}

// Scenario 2: Multi-Agent Marketing Copy Generation
async function runMultiAgentMarketing() {
  console.log("\n🎯 Starting Multi-Agent Marketing Copy Generation Scenario...\n");

  const product = await askQuestion("What product would you like to create marketing copy for? ");

  // Generate a shared history ID for all agents in this workflow
  const sharedHistoryId = randomUUID();
  console.log(`🔗 Using shared history ID: ${sharedHistoryId}\n`);

  // Marketing Agent
  async function generateMarketingCopy(input: string) {
    console.log("\n📝 Main Marketing Agent is working...");

    const model = openai("gpt-4o-mini");

    // Step 1: Generate initial marketing copy
    const { text: copy } = await generateText({
      model,
      prompt: `Write persuasive marketing copy for: ${input}. Focus on benefits and emotional appeal.`,
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          historyId: sharedHistoryId, // Shared history ID
          agentId: "marketing-agent",
          userId: "demo-user",
          conversationId: "marketing-session",
          tags: ["marketing", "copywriting"],
        },
      },
    });

    console.log(`\n📄 Initial copy generated:\n${copy}\n`);

    // Step 2: Quality Check Agent
    console.log("🔍 Quality Check Agent is analyzing...");

    const { object: qualityMetrics } = await generateObject({
      model,
      schema: z.object({
        hasCallToAction: z.boolean(),
        emotionalAppeal: z.number().min(1).max(10),
        clarity: z.number().min(1).max(10),
        recommendation: z.string(),
      }),
      prompt: `Evaluate this marketing copy for:
      1. Presence of call to action (true/false)
      2. Emotional appeal (1-10)
      3. Clarity and directness (1-10)
      4. General recommendation

      Copy to evaluate: ${copy}`,
      experimental_telemetry: {
        isEnabled: true,
        metadata: {
          historyId: sharedHistoryId, // Same shared history ID
          agentId: "quality-checker",
          parentAgentId: "marketing-agent",
          userId: "demo-user",
          conversationId: "marketing-session",
          tags: ["quality", "analysis"],
        },
      },
    });

    console.log("\n📊 Quality Analysis:");
    console.log(
      `- Call to Action: ${qualityMetrics.hasCallToAction ? "✅ Present" : "❌ Missing"}`,
    );
    console.log(`- Emotional Appeal: ${qualityMetrics.emotionalAppeal}/10`);
    console.log(`- Clarity: ${qualityMetrics.clarity}/10`);
    console.log(`- Recommendation: ${qualityMetrics.recommendation}\n`);

    // Step 3: If quality check fails, use Improvement Agent
    if (
      !qualityMetrics.hasCallToAction ||
      qualityMetrics.emotionalAppeal < 7 ||
      qualityMetrics.clarity < 7
    ) {
      console.log("🔧 Improvement Agent is working...");

      const { text: improvedCopy } = await generateText({
        model,
        prompt: `Improve this marketing copy in the following areas:
        ${!qualityMetrics.hasCallToAction ? "- Add a clear call to action" : ""}
        ${qualityMetrics.emotionalAppeal < 7 ? "- Strengthen emotional appeal" : ""}
        ${qualityMetrics.clarity < 7 ? "- Improve clarity and directness" : ""}

        Recommendation: ${qualityMetrics.recommendation}
        
        Original copy: ${copy}`,
        experimental_telemetry: {
          isEnabled: true,
          metadata: {
            historyId: sharedHistoryId, // Same shared history ID
            agentId: "improvement-agent",
            parentAgentId: "marketing-agent",
            userId: "demo-user",
            conversationId: "marketing-session",
            tags: ["improvement", "rewriting"],
          },
        },
      });

      console.log(`\n✨ Improved copy:\n${improvedCopy}\n`);
      return { copy: improvedCopy, qualityMetrics };
    }

    console.log("✅ Copy passed quality check!\n");
    return { copy, qualityMetrics };
  }

  const result = await generateMarketingCopy(product);

  console.log("🎉 Final Marketing Copy:");
  console.log("=".repeat(50));
  console.log(result.copy);
  console.log("=".repeat(50));
}

// Scenario 3: Multi-Step Research Agent
async function runResearchAgent() {
  console.log("\n🔬 Starting Research Agent Scenario...\n");

  const topic = await askQuestion("What topic would you like to research? ");

  // Generate a shared history ID for all agents in this workflow
  const sharedHistoryId = randomUUID();
  console.log(`🔗 Using shared history ID: ${sharedHistoryId}\n`);

  // Research Coordinator Agent
  console.log("\n🧭 Research Coordinator is starting...");

  const { text: researchPlan } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Create a comprehensive research plan for the topic: "${topic}". What sub-topics should we research?`,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        historyId: sharedHistoryId, // Shared history ID
        agentId: "research-coordinator",
        userId: "demo-user",
        conversationId: "research-session",
        tags: ["research", "planning"],
      },
    },
  });

  console.log(`\n📋 Research Plan:\n${researchPlan}\n`);

  // Data Collection Agent
  console.log("📊 Data Collection Agent is working...");

  const { text: dataAnalysis } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Analyze available data about "${topic}" and summarize key findings. Use the search tool to gather more information.`,
    tools: {
      searchDatabase: {
        description: "Search for relevant data and statistics",
        parameters: z.object({
          query: z.string().describe("The search query for finding relevant data"),
          category: z
            .enum(["statistics", "trends", "studies", "general"])
            .describe("The category of data to search for"),
        }),
        execute: async ({ query, category }) => {
          console.log(`🔍 Searching ${category} data for: ${query}`);
          await new Promise((resolve) => setTimeout(resolve, 1500));

          const mockData: Record<string, string> = {
            statistics: `Statistical data for "${query}": 65% adoption rate, 23% annual growth`,
            trends: `Trending patterns for "${query}": Rising interest over last 2 years, peak usage in Q4`,
            studies: `Research studies on "${query}": 12 peer-reviewed papers, 89% positive outcomes`,
            general: `General information on "${query}": Widely adopted technology with strong community support`,
          };

          return {
            query,
            category,
            results: mockData[category],
            timestamp: new Date().toISOString(),
            sources: [`database_${category}_001`, `dataset_${category}_002`],
          };
        },
      },
    },
    maxSteps: 3,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        historyId: sharedHistoryId, // Same shared history ID
        agentId: "data-collector",
        instructions:
          "You are a data collector agent. You are responsible for collecting data about the topic.",
        parentAgentId: "research-coordinator",
        userId: "demo-user",
        conversationId: "research-session",
        tags: ["data", "collection"],
      },
    },
  });

  console.log(`\n📈 Data Analysis:\n${dataAnalysis}\n`);

  // Report Generation Agent
  console.log("📝 Report Generation Agent is preparing final report...");

  const { text: finalReport } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Based on the following research plan and data analysis, prepare a comprehensive report about "${topic}":

    Research Plan:
    ${researchPlan}

    Data Analysis:
    ${dataAnalysis}`,
    experimental_telemetry: {
      isEnabled: true,
      metadata: {
        historyId: sharedHistoryId, // Same shared history ID
        agentId: "report-generator",
        parentAgentId: "research-coordinator",
        userId: "demo-user",
        conversationId: "research-session",
        tags: ["report", "synthesis"],
      },
    },
  });

  console.log("\n📄 Final Research Report:");
  console.log("=".repeat(60));
  console.log(finalReport);
  console.log("=".repeat(60));
}

// Main menu
async function showMenu() {
  console.log("\n🚀 VoltAgent + Vercel AI SDK Multi-Agent Demo");
  console.log("Test different scenarios:\n");
  console.log("1. Simple Chat (Single Agent)");
  console.log("2. Multi-Agent Marketing Copy Generation");
  console.log("3. Multi-Agent Research Scenario");
  console.log("4. Exit");

  const choice = await askQuestion("\nWhich scenario would you like to run? (1-4): ");

  switch (choice) {
    case "1":
      await runSimpleChat();
      break;
    case "2":
      await runMultiAgentMarketing();
      break;
    case "3":
      await runResearchAgent();
      break;
    case "4":
      console.log("\n👋 Goodbye!");
      rl.close();
      return false;
    default:
      console.log("\n❌ Invalid selection. Please enter a number between 1-4.");
  }

  return true;
}

async function main() {
  let continueRunning = true;

  while (continueRunning) {
    continueRunning = await showMenu();

    if (continueRunning) {
      console.log(`\n${"=".repeat(80)}`);
      await askQuestion("\nPress Enter to continue...");
    }
  }

  // Ensure all telemetry is flushed before shutdown
  await sdk.shutdown();
}

main().catch(async (error) => {
  console.error("Error:", error);
  await sdk.shutdown();
  rl.close();
});
