import { describe, expect, it } from "vitest";
import { WorkflowExecutionRequestSchema } from "./agent.schemas";

describe("WorkflowExecutionRequestSchema", () => {
  it("accepts options.workflowState payload", () => {
    const payload = {
      input: { value: 1 },
      options: {
        userId: "user-1",
        workflowState: {
          subjectMessage: "Hello",
          retryCount: 2,
        },
      },
    };

    expect(() => WorkflowExecutionRequestSchema.safeParse(payload)).not.toThrow();

    const parsed = WorkflowExecutionRequestSchema.parse(payload);

    expect(parsed.options?.workflowState).toEqual({
      subjectMessage: "Hello",
      retryCount: 2,
    });
  });

  it("accepts options.metadata payload", () => {
    const payload = {
      input: { value: 1 },
      options: {
        userId: "user-1",
        metadata: {
          tenantId: "acme",
          region: "us-east-1",
        },
      },
    };

    expect(() => WorkflowExecutionRequestSchema.safeParse(payload)).not.toThrow();

    const parsed = WorkflowExecutionRequestSchema.parse(payload);

    expect(parsed.options?.metadata).toEqual({
      tenantId: "acme",
      region: "us-east-1",
    });
  });
});
