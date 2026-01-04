import { readFileSync } from "node:fs";
import { openai } from "@ai-sdk/openai";
import { Memory, NodeFilesystemBackend, PlanAgent, VoltAgent } from "@voltagent/core";
import { LibSQLMemoryAdapter } from "@voltagent/libsql";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { internetSearch } from "./tools.js";

const logger = createPinoLogger({
  name: "with-planagents",
  level: "info",
});

const memory = new Memory({
  storage: new LibSQLMemoryAdapter(),
});

const researchInstructions = [
  "You are an expert researcher. Your job is to conduct thorough research and then write a polished report.",
  "",
  "You have access to an internet search tool as your primary means of gathering information.",
  "",
  "## internet_search",
  "Use this to run an internet search for a given query. You can specify the max number of results to return, the topic, and whether raw content should be included.",
].join("\n");

const agent = new PlanAgent({
  name: "deep-research-agent",
  systemPrompt: researchInstructions,
  model: openai("gpt-4o-mini"),
  tools: [internetSearch],
  memory,
  maxSteps: 100,
  summarization: {
    triggerTokens: 1200,
    keepMessages: 6,
    maxOutputTokens: 600,
  },
  filesystem: {
    backend: new NodeFilesystemBackend({
      rootDir: process.cwd(),
      virtualMode: true,
    }),
  },
});

new VoltAgent({
  agents: {
    agent,
  },
  server: honoServer(),
  logger,
});

const runSummaryDemo = async () => {
  const conversationId = "observability-summary-demo";
  const userId = "demo-user";
  const report = readFileSync(new URL("../voltagent_detailed_report.txt", import.meta.url), "utf8");

  await agent.generateText(
    "We are building a comparison report for two agent frameworks. Start with a brief outline and focus on architecture, observability, and extensibility.",
    { conversationId, userId },
  );
  await agent.generateText(`Here is a detailed background report:\n\n${report}\n\n${report}`, {
    conversationId,
    userId,
  });
  await agent.generateText(
    "Now produce a concise executive summary and list three key differences.",
    { conversationId, userId },
  );
};

void runSummaryDemo();
