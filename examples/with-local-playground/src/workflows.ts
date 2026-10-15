import { createWorkflowChain } from "@voltagent/core";
import { z } from "zod";
import { classification, classifier } from "./agents.js";

export const triage = createWorkflowChain({
  id: "real-triage",
  name: "Ticket triage · model + human review",
  purpose:
    'The real model classifies a ticket, then waits for review. Resume with {"approved":true} to queue it locally, or false to decline. You can also cancel the checkpoint or replay a step.',
  input: z.object({
    message: z.string().min(3).default("I was billed twice this month. Please review a refund."),
  }),
  result: classification.extend({ decision: z.enum(["queued", "declined"]) }),
})
  .andAgent(async ({ data }) => data.message, classifier, { schema: classification })
  .andThen({
    id: "human-review",
    resumeSchema: z.object({ approved: z.boolean() }),
    execute: async ({ data, suspend, resumeData }) => {
      if (!resumeData) await suspend("Review the classification, then approve or decline.");
      return {
        ...data,
        decision: resumeData?.approved ? ("queued" as const) : ("declined" as const),
      };
    },
  });
