import { Agent, VoltAgent, createTool } from "@voltagent/core";
import { createPinoLogger } from "@voltagent/logger";
import { honoServer } from "@voltagent/server-hono";
import { z } from "zod";

const logger = createPinoLogger({
  name: "with-hitl",
  level: "info",
});

const deleteCrmUserTool = createTool({
  name: "deleteCrmUser",
  description: "Permanently deletes a user record from CRM.",
  parameters: z.object({
    userId: z.string().min(1),
    reason: z.string().min(3).optional(),
  }),
  // Destructive action: always requires human approval.
  needsApproval: true,
  execute: async ({ userId, reason }) => {
    return {
      ok: true,
      action: "user-deleted",
      userId,
      reason: reason || "not provided",
      executedAt: new Date().toISOString(),
    };
  },
});

const crmHitlAgent = new Agent({
  name: "CRM HITL Agent",
  instructions: [
    "You are a CRM operations assistant.",
    "Execute account-management changes through available actions.",
    "When a user asks to delete an account and provides a user ID, perform the deletion action first, then report status.",
    "Deletion reason is optional; if it is not provided, use a short default reason like 'user-requested deletion'.",
    "Do not claim a deletion succeeded unless the action actually ran.",
  ].join("\n"),
  model: "openai/gpt-4o-mini",
  tools: [deleteCrmUserTool],
});

const crmAgent = new Agent({
  name: "CRM Agent",
  instructions: [
    "You handle CRM account operations.",
    "Execute requested account changes through available actions.",
    "For delete-account requests, if user ID exists in the request or shared context, run the delete action before reporting status.",
    "Deletion reason is optional; if missing, use 'user-requested deletion'.",
    "Do not report deletion completion unless it actually happened.",
    "Use concise operator-style responses.",
  ].join("\n"),
  model: "openai/gpt-4o-mini",
  tools: [deleteCrmUserTool],
});

const triageAgent = new Agent({
  name: "Triage Agent",
  instructions: [
    "You triage incoming support and operations requests.",
    "Route CRM-specific account mutations to the CRM specialist.",
    "Provide the user a short, clear final response.",
  ].join("\n"),
  model: "openai/gpt-4o-mini",
  subAgents: [
    {
      agent: crmAgent,
      method: "streamText",
      options: {
        temperature: 0,
        maxSteps: 4,
      },
    },
  ],
});

new VoltAgent({
  agents: {
    crmHitlAgent,
    triageAgent,
    crmAgent,
  },
  server: honoServer(),
  logger,
});
