import VoltAgent, { Agent, createTool } from "@voltagent/core";
import { createOpenAI } from "@ai-sdk/openai";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";
import * as readline from "readline";
import { exec } from "child_process";
import { promisify } from "util";
import { createPinoLogger } from "packages/logger/dist";

const execAsync = promisify(exec);

// Initialize OpenAI
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Create client-side tools (no execute function)
const changeSystemThemeTool = createTool({
  name: "changeSystemTheme",
  description: "Changes the system theme to light or dark mode",
  parameters: z.object({
    theme: z.enum(["light", "dark"]).describe("The theme to switch to"),
  }),
  // No execute function - this will be handled client-side
});

const openUrlTool = createTool({
  name: "openUrl",
  description: "Opens a URL in the default browser",
  parameters: z.object({
    url: z.string().url().describe("The URL to open"),
  }),
  // No execute function - this will be handled client-side
});

// Create a server-side tool for comparison
const getSystemInfoTool = createTool({
  name: "getSystemInfo",
  description: "Gets basic system information",
  parameters: z.object({}),
  execute: async () => {
    const platform = process.platform;
    const nodeVersion = process.version;
    const currentTime = new Date().toISOString();

    return {
      platform,
      nodeVersion,
      currentTime,
    };
  },
});

// Create the agent
const agent = new Agent({
  id: "ui-assistant",
  name: "UI Assistant",
  instructions: `You are a helpful UI assistant that can:
- Change the system theme between light and dark mode
- Open URLs in the browser (with user permission)
- Get system information

Always be helpful and explain what you're doing. When using tools that affect the user's system,
explain why you're using them.`,
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  tools: [changeSystemThemeTool, openUrlTool, getSystemInfoTool],
});

// Create readline interface for user interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

// Client-side tool executors
const clientToolExecutors = {
  changeSystemTheme: async (args: { theme: "light" | "dark" }) => {
    console.log(`\n⚡ Tool Request: Change system theme to ${args.theme}`);
    const approved = await question("Do you approve this action? (yes/no): ");

    if (approved.toLowerCase() !== "yes") {
      return { success: false, message: "User denied permission to change theme" };
    }

    // Simulate theme change (in a real app, this would change the actual theme)
    console.log(`✅ Theme changed to ${args.theme} mode`);
    return { success: true, theme: args.theme };
  },

  showNotification: async (args: { title: string; message: string; type?: string }) => {
    console.log(`\n⚡ Tool Request: Show notification`);
    console.log(`   Title: ${args.title}`);
    console.log(`   Message: ${args.message}`);
    console.log(`   Type: ${args.type || "info"}`);

    const approved = await question("Do you approve this notification? (yes/no): ");

    if (approved.toLowerCase() !== "yes") {
      return { success: false, message: "User denied permission to show notification" };
    }

    // On macOS, we can use osascript to show a real notification
    if (process.platform === "darwin") {
      try {
        await execAsync(
          `osascript -e 'display notification "${args.message}" with title "${args.title}"'`,
        );
        console.log("✅ Notification shown");
        return { success: true, shown: true };
      } catch (error) {
        console.log("❌ Failed to show notification:", error);
        return { success: false, error: "Failed to show notification" };
      }
    } else {
      // For other platforms, just simulate
      console.log("✅ [Simulated] Notification would be shown");
      return { success: true, shown: true, simulated: true };
    }
  },

  openUrl: async (args: { url: string }) => {
    console.log(`\n⚡ Tool Request: Open URL`);
    console.log(`   URL: ${args.url}`);

    const approved = await question("Do you approve opening this URL? (yes/no): ");

    if (approved.toLowerCase() !== "yes") {
      return { success: false, message: "User denied permission to open URL" };
    }

    // Open URL based on platform
    let command: string;
    switch (process.platform) {
      case "darwin":
        command = `open "${args.url}"`;
        break;
      case "win32":
        command = `start "${args.url}"`;
        break;
      default:
        command = `xdg-open "${args.url}"`;
    }

    try {
      await execAsync(command);
      console.log("✅ URL opened in browser");
      return { success: true, opened: true, url: args.url };
    } catch (error) {
      console.log("❌ Failed to open URL:", error);
      return { success: false, error: "Failed to open URL" };
    }
  },
};

new VoltAgent({
  agents: {
    uiAssistant: agent,
  },
  logger: createPinoLogger({
    name: "ui-assistant",
    level: "info",
  }),
});

// Main conversation loop
async function main() {
  console.log("🤖 UI Assistant with Client-Side Tools");
  console.log("=====================================");
  console.log("\nAvailable tools:");
  agent.getTools().forEach((tool) => {
    console.log(`- ${tool.name}: ${tool.isClientSide() ? "client-side" : "server-side"}`);
  });
  console.log('\nType "exit" to quit.\n');

  const userId = "demo-user-123";
  const conversationId = `conversation-${Date.now()}`;

  while (true) {
    const input = await question("\nYou: ");

    if (input.toLowerCase() === "exit") {
      console.log("\nGoodbye! 👋");
      rl.close();
      break;
    }

    try {
      console.log("\nAssistant: ");

      // Stream the response
      const stream = await agent.streamText(input, {});

      // Register tool call handler
      stream.onToolCall(async (toolCall) => {
        console.log(`\n⚡ Tool Request: ${toolCall.toolName}`);

        const executor = clientToolExecutors[toolCall.toolName as keyof typeof clientToolExecutors];
        if (!executor) {
          console.log("❌ No executor found for this tool");
          return;
        }

        // Execute the tool and return result
        return await executor(toolCall.args);
      });

      // Process the stream
      for await (const part of stream.fullStream ?? []) {
        if (part.type === "text-delta") {
          process.stdout.write(part.textDelta);
        }
      }

      console.log("\n");
    } catch (error) {
      console.error("\n❌ Error:", error);
    }
  }
}

// Run the example
main().catch(console.error);
