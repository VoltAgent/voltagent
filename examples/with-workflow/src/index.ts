import { openai } from "@ai-sdk/openai";
import {
  Agent,
  VoltAgent,
  createWorkflowChain,
  andThen,
  andAgent,
  andWhen,
  andAll,
  andRace,
} from "@voltagent/core";
import { VercelAIProvider } from "@voltagent/vercel-ai";
import { z } from "zod";

// We define two simple agents for different tasks.
const writerAgent = new Agent({
  name: "WriterAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions: "You are a creative writer. You write brief, engaging, and friendly content.",
});

const analystAgent = new Agent({
  name: "AnalystAgent",
  llm: new VercelAIProvider(),
  model: openai("gpt-4o-mini"),
  instructions:
    "You are an expert analyst. You are great at analyzing text, sentiment, and data. You provide structured insights.",
});

const simpleWorkflow = createWorkflowChain({
  id: "simple-greeting",
  name: "Personalized Greeting",
  purpose: "A simple workflow to greet a user by name.",
  input: z.object({
    name: z.string(),
  }),
  result: z.object({
    greeting: z.string(),
  }),
})
  // Step 1: `andThen` to prepare the name (trim whitespace).
  // This uses a standard function to prepare data for the next step.
  .andThen({
    id: "prepare-name",
    execute: async (data) => ({
      name: data.name,
      preparedName: data.name.trim(),
    }),
  })
  // Step 2: `andAgent` to generate a greeting using AI.
  // We ask the WriterAgent to create a message using the prepared name.
  .andAgent(
    async (data) => `Generate a short, friendly greeting for ${data.preparedName}.`,
    writerAgent,
    {
      schema: z.object({
        greeting: z.string(),
      }),
    },
  );

const intermediateWorkflow = createWorkflowChain({
  id: "conditional-summary",
  name: "Conditional Text Summary",
  purpose: "Summarizes a text, but only if it's longer than 15 words.",
  input: z.object({
    text: z.string(),
  }),
  result: z.object({
    originalText: z.string(),
    wordCount: z.number(),
    summary: z.string().optional(),
    message: z.string(),
  }),
})
  // Step 1: `andThen` to analyze the text and count the words.
  .andThen({
    id: "analyze-text",
    name: "analyze-text",
    execute: async (data) => {
      const wordCount = data.text.trim().split(/\s+/).length;
      return {
        originalText: data.text,
        wordCount,
        isLong: wordCount > 15, // Create a flag for the condition
      };
    },
  })
  // Step 2: `andWhen` to summarize with AI if the text is long.
  // This step only runs if `isLong` is true and preserves all previous data.
  .andWhen({
    id: "summarize-if-long",
    name: "summarize-if-long",
    condition: async (data) => data.isLong,
    step: andAgent(
      async (data) => `Summarize the following text in one sentence: "${data.originalText}"`,
      writerAgent,
      {
        schema: z.object({
          originalText: z.string(),
          wordCount: z.number(),
          isLong: z.boolean(),
          summary: z.string(),
        }),
      },
    ),
  })
  // Step 3: `andThen` to format the final output.
  // It creates a user-friendly message based on whether a summary was generated.
  .andThen({
    id: "format-output",
    name: "format-output",
    execute: async (data) => {
      // data can be either the analyze-text result or the summarize-if-long result
      const hasSummary = "summary" in data;
      return {
        originalText: data.originalText,
        wordCount: data.wordCount,
        summary: hasSummary ? data.summary : undefined,
        message: hasSummary
          ? `Text has ${data.wordCount} words and was summarized.`
          : `Text has ${data.wordCount} words. Too short to summarize.`,
      };
    },
  });

// Simplified workflow that demonstrates parallel execution without complex types
const advancedWorkflow = createWorkflowChain({
  id: "research-assistant",
  name: "Mini Research Assistant",
  purpose: "Demonstrates a simple parallel flow and race conditions.",
  input: z.object({
    topic: z.string(),
  }),
  result: z.object({
    topic: z.string(),
    summary: z.string(),
    winner: z.string(),
  }),
})
  // Step 1: `andAgent` to generate content about the topic.
  .andAgent(
    async (data) => `Write a brief research summary about "${data.topic}". Include 3 key points.`,
    analystAgent,
    {
      schema: z.object({
        topic: z.string(),
        content: z.string(),
      }),
    },
  )
  // Step 2: `andRace` to find the fastest agent to produce a summary.
  // Two AI steps start at the same time; the first to finish wins.
  .andRace({
    id: "race-summarizers",
    name: "race-summarizers",
    steps: [
      // A fast but less detailed agent
      andThen({
        id: "fast-summarizer",
        name: "fast-summarizer",
        execute: async (data: { topic: string; content: string }) => {
          const { object } = await writerAgent.generateObject(
            `Summarize this research text concisely: "${data.content}"`,
            z.object({ summary: z.string() }),
          );
          return {
            topic: data.topic,
            summary: object.summary,
            winner: "fast-summarizer",
          };
        },
      }) as any, // Type assertion to bypass complex type inference
      // A slower but higher-quality agent (simulated)
      andThen({
        id: "quality-summarizer",
        name: "quality-summarizer",
        execute: async (data: { topic: string; content: string }) => {
          await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate slowness
          const { object } = await analystAgent.generateObject(
            `Provide a detailed, high-quality summary of this text: "${data.content}"`,
            z.object({ summary: z.string() }),
          );
          return {
            topic: data.topic,
            summary: object.summary,
            winner: "quality-summarizer",
          };
        },
      }) as any, // Type assertion to bypass complex type inference
    ],
  });

new VoltAgent({
  agents: {
    writerAgent,
    analystAgent,
  },
  workflows: {
    simpleWorkflow,
    intermediateWorkflow,
    advancedWorkflow,
  },
});
