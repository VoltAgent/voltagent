import { openai } from "@ai-sdk/openai";
import { Agent, InMemoryStorageAdapter, Memory, tool } from "@voltagent/core";
import { OpenAIVoiceProvider } from "@voltagent/voice";
import { z } from "zod";
import "./env.js";

export const model = openai(process.env.OPENAI_MODEL ?? "gpt-4o-mini");
const memory = () => new Memory({ storage: new InMemoryStorageAdapter() });
const common = { model, maxSteps: 4, maxOutputTokens: 500, maxRetries: 1 };
const articles = [
  {
    id: "reset-password",
    title: "Reset your password",
    body: "Use Forgot password on the sign-in page. The reset link expires after 30 minutes.",
  },
  {
    id: "refund-policy",
    title: "Refund policy",
    body: "Unused plans can be refunded within 14 days. Requests require a human review. Never promise an issued refund.",
  },
  {
    id: "api-access",
    title: "API access",
    body: "Create a scoped API key under Settings > API keys. Never paste your secret key into a support conversation.",
  },
];

export const support = new Agent({
  ...common,
  id: "real-support",
  name: "01 · Support with knowledge search",
  voice: new OpenAIVoiceProvider({ apiKey: process.env.OPENAI_API_KEY ?? "", voice: "alloy" }),
  instructions: ({ context }) =>
    `You support a fictional SaaS product. Always call search_help before answering a support question. Cite the returned article ID. Reply in ${context.get("language")}. Keep answers short; admit missing information.`,
  contextSchema: z.object({ language: z.enum(["en", "tr"]).default("en") }),
  memory: memory(),
  tools: {
    search_help: tool({
      description:
        "Search the small local help center. All data is fictional; no network request is made by this tool.",
      inputSchema: z.object({ query: z.string().min(1) }),
      execute: async ({ query }) => {
        const words = query
          .toLowerCase()
          .split(/\W+/)
          .filter((word) => word.length > 2);
        return articles.filter((article) =>
          words.some((word) => `${article.title} ${article.body}`.toLowerCase().includes(word)),
        );
      },
    }),
  },
});

export const approval = new Agent({
  ...common,
  id: "real-approval",
  name: "02 · Refund preview with approval",
  // Let the SDK request approval; do not rely on the model asking in plain text.
  prepareStep: ({ messages }) => ({
    toolChoice: messages
      .slice(messages.map((message) => message.role).lastIndexOf("user") + 1)
      .some((message) => message.role === "tool")
      ? "none"
      : { type: "tool", toolName: "preview_refund" },
  }),
  instructions:
    "Create a refund PREVIEW using preview_refund when given a ticket ID and amount. The tool requires user approval. After approval, summarize its result. If denied, acknowledge the denial and do not call it again. No money is moved.",
  memory: false,
  tools: {
    preview_refund: tool({
      description: "Prepare a local refund preview; never issues a real refund.",
      inputSchema: z.object({ ticketId: z.string(), amount: z.number().positive().max(1000) }),
      needsApproval: true,
      execute: async ({ ticketId, amount }) => ({
        ticketId,
        amount,
        currency: "USD",
        status: "preview-only",
      }),
    }),
  },
});

export const browser = new Agent({
  ...common,
  id: "real-browser",
  name: "03 · Browser tool result",
  prepareStep: ({ messages }) => ({
    toolChoice: messages
      .slice(messages.map((message) => message.role).lastIndexOf("user") + 1)
      .some((message) => message.role === "tool")
      ? "none"
      : { type: "tool", toolName: "browser_context" },
  }),
  instructions:
    "Call browser_context once to obtain the browser theme and locale. Wait for its result, then briefly acknowledge the returned values. If the client declines, acknowledge that; do not call it again.",
  memory: false,
  tools: {
    browser_context: tool({
      description:
        "Ask the client for its theme and locale. Enter a JSON result in the playground, for example theme=dark, locale=tr-TR.",
      inputSchema: z.object({}),
    }),
  },
});

export const conversation = new Agent({
  ...common,
  id: "real-memory",
  name: "04 · Conversation and summarization",
  instructions:
    "Keep track of the user’s preferences. Reply in one short sentence. When asked, recall preferences from the conversation summary.",
  memory: memory(),
  summarization: { enabled: true, triggerTokens: 1, keepMessages: 1, maxOutputTokens: 200, model },
});

export const classification = z.object({
  category: z.enum(["billing", "technical", "account"]),
  priority: z.enum(["low", "normal", "high"]),
  summary: z.string(),
});
export const classifier = new Agent({
  ...common,
  id: "real-classifier",
  name: "Ticket classifier",
  memory: false,
  instructions:
    "Classify the support ticket. Refund and payment questions are billing. Service outages are high priority. Summarize in one short sentence.",
});
