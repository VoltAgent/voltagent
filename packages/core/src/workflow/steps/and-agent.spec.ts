import { safeStringify } from "@voltagent/internal";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  createMockLanguageModel,
  createTestAgent,
  defaultMockResponse,
} from "../../agent/test-utils";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andAgent } from "./and-agent";

describe("andAgent", () => {
  it("maps agent output into existing data when mapper is provided", async () => {
    const agent = createTestAgent({
      model: createMockLanguageModel({
        doGenerate: {
          ...defaultMockResponse,
          content: [
            {
              type: "text" as const,
              text: safeStringify({ type: "support", priority: "high" }),
            },
          ],
        },
      }),
    });

    const step = andAgent(
      ({ data }) => `What type of email is this: ${data.email}`,
      agent,
      {
        schema: z.object({
          type: z.enum(["support", "sales", "spam"]),
          priority: z.enum(["low", "medium", "high"]),
        }),
      },
      (output, { data }) => ({ ...data, emailType: output }),
    );

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: { email: "help@acme.com", userId: "u-1" },
      }),
    );

    expect(result).toEqual({
      email: "help@acme.com",
      userId: "u-1",
      emailType: { type: "support", priority: "high" },
    });
  });
});
