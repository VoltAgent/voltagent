import { Agent, Memory, Tool, ToolDeniedError, VoltAgent, messageHelpers } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

// Simple tool for demonstration
const weatherTool = new Tool({
  name: "get_weather",
  description: "Get the current weather for a location",
  parameters: z.object({
    location: z.string().describe("The location to get weather for"),
  }),
  execute: async ({ location }: { location: string }) => {
    // Simulated weather data
    return {
      location,
      temperature: Math.floor(Math.random() * 30) + 10,
      condition: ["sunny", "cloudy", "rainy", "partly cloudy"][Math.floor(Math.random() * 4)],
    };
  },
});

// Create agent with all hooks
const agent = new Agent({
  name: "HooksDemo",
  instructions: "Agent demonstrating all available hooks",
  model: "openai/gpt-4o-mini",
  tools: [weatherTool],
  memory: new Memory({
    storage: new LibSQLMemoryAdapter({
      url: "file:./.voltagent/memory.db",
    }),
  }),

  hooks: {
    // Called when the agent starts processing
    onStart: async ({ agent, context }) => {
      console.log("\n🚀 [onStart] Agent started");
      console.log(`   Agent: ${agent.name}`);
      console.log(`   Operation ID: ${context.operationId}`);
    },

    // NEW: Called before messages are sent to LLM - allows transformation
    onPrepareMessages: async ({ messages }) => {
      console.log("\n📝 [onPrepareMessages] Preparing messages for LLM");
      console.log(`   Original message count: ${messages.length}`);

      // Simple example: Add current time context to user messages
      // Using the new message helpers for cleaner, type-safe code!
      // Before: Complex if/else checking content types
      // After: One line with messageHelpers!
      const timestamp = new Date().toLocaleTimeString();
      const enhancedMessages = messages.map((msg) =>
        messageHelpers.addTimestampToMessage(msg, timestamp),
      );

      console.log(`   Processed ${messages.filter((m) => m.role === "user").length} user messages`);

      // Other helpful message utilities available:
      // - messageHelpers.extractText(content) - Get text from any content type
      // - messageHelpers.hasImagePart(content) - Check for images
      // - messageHelpers.transformTextContent(content, fn) - Transform text parts
      // - messageHelpers.MessageContentBuilder - Build complex content

      // Return transformed messages
      return { messages: enhancedMessages };
    },

    // Called when a tool starts executing
    onToolStart: async ({ tool, args, context }) => {
      console.log("\n🔧 [onToolStart] Tool execution started");
      console.log(`   Tool: ${tool.name}`);
      console.log(`   Description: ${tool.description}`);
      if (args.location === "New York" && context.userId === "guest") {
        throw new ToolDeniedError({
          toolName: tool.name,
          message: "Pro plan required for this tool.",
          code: "TOOL_FORBIDDEN",
          httpStatus: 403,
        });
      }
    },

    // Called when a tool finishes executing
    onToolEnd: async ({ tool, output, error }) => {
      console.log("\n✅ [onToolEnd] Tool execution completed");
      console.log(`   Tool: ${tool.name}`);
      if (error) {
        console.log(`   ❌ Error: ${error.message}`);
      } else {
        console.log("✨ Output:", output);
      }
    },

    // Called when the agent finishes processing
    onEnd: async ({ conversationId, output, error, context }) => {
      console.log("\n🏁 [onEnd] Agent finished");
      console.log(`   Conversation ID: ${conversationId}`);
      console.log(`   Operation ID: ${context.operationId}`);

      if (error) {
        console.log(`   ❌ Error occurred: ${error.message}`);
      } else if (output) {
        console.log("✨ Success! Output:", output);
      }

      // Could log to external service, clean up resources, etc.
    },

    // Called when an agent hands off to another agent (in multi-agent scenarios)
    onHandoff: async ({ agent, sourceAgent }) => {
      console.log("\n🤝 [onHandoff] Agent handoff");
      console.log(`   From: ${sourceAgent.name}`);
      console.log(`   To: ${agent.name}`);
    },
  },
});

new VoltAgent({
  agents: {
    agent,
  },
  server: honoServer({ port: 3141 }),
});
