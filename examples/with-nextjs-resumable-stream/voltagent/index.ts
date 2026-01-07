import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";
import { sharedMemory } from "./memory";
// Uppercase conversion tool
const uppercaseTool = createTool({
  name: "uppercase",
  description: "Convert text to uppercase",
  parameters: z.object({
    text: z.string().describe("Text to convert to uppercase"),
  }),
  execute: async (args) => {
    return { result: args.text.toUpperCase() };
  },
});

// Word count tool
const wordCountTool = createTool({
  name: "countWords",
  description: "Count words in text",
  parameters: z.object({
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

// Story writing tool
const storyWriterTool = createTool({
  name: "writeStory",
  description: "Write a 50-word story about the given text",
  parameters: z.object({
    text: z.string().describe("Text to write a story about"),
  }),
  execute: async (args) => {
    // The agent will handle the creative writing
    return { topic: args.text };
  },
});

// Uppercase agent
const uppercaseAgent = new Agent({
  name: "UppercaseAgent",
  instructions:
    "You are a text transformer. When given text, use the uppercase tool to convert it to uppercase and return the result.",
  model: openai("gpt-4o-mini"),
  tools: [uppercaseTool],
  memory: sharedMemory,
});

// Word count agent
const wordCountAgent = new Agent({
  name: "WordCountAgent",
  instructions:
    "You are a text analyzer. When given text, use the countWords tool to count the words and return the count.",
  model: openai("gpt-4o-mini"),
  tools: [wordCountTool],
  memory: sharedMemory,
});

// Story writer agent
const storyWriterAgent = new Agent({
  name: "StoryWriterAgent",
  instructions:
    "You are a creative story writer. When given text, use the writeStory tool to acknowledge the topic, then write EXACTLY a 50-word story about or inspired by that text. Be creative and engaging. Make sure your story is exactly 50 words, no more, no less.",
  model: openai("gpt-4o-mini"),
  tools: [storyWriterTool],
  memory: sharedMemory,
});

// Supervisor agent that delegates to sub-agents
export const supervisorAgent = new Agent({
  name: "Supervisor",
  instructions:
    "You are a text processing supervisor. When given any text input, you MUST delegate to ALL THREE agents: UppercaseAgent, WordCountAgent, AND StoryWriterAgent. Delegate to all of them to process the text in parallel. Then combine and present all three results to the user: the uppercase version, the word count, and the 50-word story.",
  model: openai("gpt-4o-mini"),
  subAgents: [uppercaseAgent, wordCountAgent, storyWriterAgent],
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

// Initialize the singleton
export const voltAgent = getVoltAgentInstance();

// Export the supervisor as the main agent
export const agent = supervisorAgent;
