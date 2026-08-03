import { Agent, VoltAgent, tool } from "@voltagent/core";
import honoServer from "@voltagent/server-hono";
import { z } from "zod";
import { sharedMemory } from "./memory";

// Check for AI_GATEWAY_API_KEY
if (process.env.AI_GATEWAY_API_KEY) {
  console.log("✅ AI_GATEWAY_API_KEY is configured");
} else {
  console.log("ℹ️  AI_GATEWAY_API_KEY not set (optional)");
}

const uppercaseTool = tool({
  description: "Convert text to uppercase",
  inputSchema: z.object({
    text: z.string().describe("Text to convert to uppercase"),
  }),
  execute: async (args) => {
    return { result: args.text.toUpperCase() };
  },
});

const wordCountTool = tool({
  description: "Count words in text",
  inputSchema: z.object({
    text: z.string().describe("Text to count words in"),
  }),
  execute: async (args) => {
    const words = args.text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0);
    return { count: words.length, words: words };
  },
});

const storyWriterTool = tool({
  description: "Write a 50-word story about the given text",
  inputSchema: z.object({
    text: z.string().describe("Text to write a story about"),
  }),
  execute: async (args) => {
    // The agent will handle the creative writing
    return { topic: args.text };
  },
});

const uppercaseAgent = new Agent({
  name: "UppercaseAgent",
  instructions:
    "You are a text transformer. When given text, use the uppercase tool to convert it to uppercase and return the result.",
  model: "openai/gpt-4o-mini",
  tools: {
    uppercase: uppercaseTool,
  },
  memory: sharedMemory,
});

const wordCountAgent = new Agent({
  name: "WordCountAgent",
  instructions:
    "You are a text analyzer. When given text, use the countWords tool to count the words and return the count.",
  model: "openai/gpt-4o-mini",
  tools: {
    countWords: wordCountTool,
  },
  memory: sharedMemory,
});

const storyWriterAgent = new Agent({
  name: "StoryWriterAgent",
  instructions:
    "You are a creative story writer. When given text, use the writeStory tool to acknowledge the topic, then write EXACTLY a 50-word story about or inspired by that text. Be creative and engaging. Make sure your story is exactly 50 words, no more, no less.",
  model: "openai/gpt-4o-mini",
  tools: {
    writeStory: storyWriterTool,
  },
  memory: sharedMemory,
});

// Supervisor agent that uses all tools directly
export const supervisorAgent = new Agent({
  name: "Supervisor",
  instructions: `You are a text processing supervisor. When given any text input, you MUST use ALL THREE tools: uppercase, countWords, and writeStory. Use all of them to process the text. 

Present the results in this exact format:

**🔤 Uppercase Version:**
[Uppercase result here]

**📊 Word Analysis:**  
[Word count and analysis here]

**📖 Creative Story:**
[50-word story here]

Make sure to format each section clearly with bold headers and proper spacing.`,
  model: "openai/gpt-4o-mini",
  tools: {
    uppercase: uppercaseTool,
    countWords: wordCountTool,
    writeStory: storyWriterTool,
  },
  memory: sharedMemory,
});

// Type declaration for global augmentation
declare global {
  var voltAgentInstance: VoltAgent | undefined;
}

// Singleton initialization function
function getVoltAgentInstance() {
  if (!globalThis.voltAgentInstance) {
    globalThis.voltAgentInstance = new VoltAgent({
      agents: {
        supervisorAgent,
        storyWriterAgent,
        wordCountAgent,
        uppercaseAgent,
      },
      server: honoServer(),
    });
  }
  return globalThis.voltAgentInstance;
}

// Initialize the singleton after all agents are defined
export const voltAgent = getVoltAgentInstance();

// Export the supervisor as the main agent
export const agent = supervisorAgent;
