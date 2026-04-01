import { Agent, createTool } from "@voltagent/core";
import { z } from "zod";

const getCurrentTimeTool = createTool({
  name: "getCurrentTime",
  description: "Get the current date and time for a given IANA timezone.",
  parameters: z.object({
    timeZone: z
      .string()
      .default("UTC")
      .describe("IANA timezone. Example: Europe/Istanbul, America/New_York"),
  }),
  execute: async ({ timeZone }) => {
    const date = new Date();

    try {
      return {
        timeZone,
        iso: date.toISOString(),
        formatted: new Intl.DateTimeFormat("en-US", {
          dateStyle: "full",
          timeStyle: "long",
          timeZone,
        }).format(date),
      };
    } catch {
      return {
        timeZone: "UTC",
        iso: date.toISOString(),
        formatted: new Intl.DateTimeFormat("en-US", {
          dateStyle: "full",
          timeStyle: "long",
          timeZone: "UTC",
        }).format(date),
      };
    }
  },
});

export const slackAssistantAgent = new Agent({
  name: "ChatSDKSlackAssistant",
  instructions: [
    "You are a helpful assistant inside Slack.",
    "Keep replies concise and practical.",
    "If the user asks for time in a city/timezone, call getCurrentTime.",
  ].join("\n"),
  model: "openai/gpt-4o-mini",
  tools: [getCurrentTimeTool],
});
