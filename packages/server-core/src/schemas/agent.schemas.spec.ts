import { describe, expect, it } from "vitest";
import { WorkflowExecutionRequestSchema } from "./agent.schemas";

describe("WorkflowExecutionRequestSchema", () => {
  it("accepts options.metadata payload", () => {
    const parsed = WorkflowExecutionRequestSchema.parse({
      input: { value: 1 },
      options: {
        userId: "user-1",
        metadata: {
          tenantId: "acme",
          region: "us-east-1",
        },
      },
    });

    expect(parsed.options?.metadata).toEqual({
      tenantId: "acme",
      region: "us-east-1",
    });
  });
});
