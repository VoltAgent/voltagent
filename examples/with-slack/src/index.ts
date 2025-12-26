import { openai } from "@ai-sdk/openai";
import { Agent, VoltAgent, createTool, createTriggers } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { VoltOpsClient } from "@voltagent/sdk";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";
import { weatherTool } from "./tools/weather.js";

type SlackMessagePayload = {
  channel?: string;
  thread_ts?: string;
  ts?: string;
  text?: string;
  user?: string;
};

const logger = createPinoLogger({
  name: "with-slack",
  level: "info",
});

const voltOps = new VoltOpsClient({
  publicKey: process.env.VOLTAGENT_PUBLIC_KEY ?? "",
  secretKey: process.env.VOLTAGENT_SECRET_KEY ?? "",
});

const sendSlackMessage = createTool({
  name: "sendSlackMessage",
  description: "Send a message to a Slack channel or thread via VoltOps.",
  parameters: z.object({
    channelId: z.string().describe("Slack channel ID (e.g., C08N97UCUKE)"),
    text: z.string().describe("Message text to send"),
    threadTs: z.string().optional().describe("Thread timestamp if replying in-thread"),
  }),
  execute: async ({ channelId, text, threadTs }) => {
    const credentialId = process.env.SLACK_CREDENTIAL_ID;
    if (!credentialId) {
      throw new Error("SLACK_CREDENTIAL_ID is not set");
    }

    return voltOps.actions.slack.postMessage({
      credential: {
        credentialId,
      },
      channelId,
      text,
      threadTs,
      linkNames: true,
    });
  },
});

const slackAgent = new Agent({
  name: "slack-agent",
  instructions: "You are a Slack assistant.",
  tools: [weatherTool, sendSlackMessage],
  model: openai("gpt-4o-mini"),
});

new VoltAgent({
  agents: { slackAgent },
  server: honoServer(),
  logger,
  triggers: createTriggers((on) => {
    on.slack.messagePosted(async ({ payload, agents }) => {
      const event = (payload as SlackMessagePayload | undefined) ?? {};
      const channelId = event.channel;
      const threadTs = event.thread_ts ?? event.ts;
      const text = event.text ?? "";
      const userId = event.user ?? "unknown-user";

      if (!channelId || !text) {
        logger.warn("Missing channel or text in Slack payload");
        return;
      }

      await agents.slackAgent.generateText(`Slack channel: ${channelId}
Thread: ${threadTs ?? "new thread"}
User: <@${userId}>
Message: ${text}
Respond in Slack via sendSlackMessage; use getWeather for weather questions.`);
    });
  }),
});
