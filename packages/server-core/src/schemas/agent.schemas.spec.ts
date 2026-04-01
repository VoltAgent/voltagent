import { describe, expect, it } from "vitest";
import { GenerateOptionsSchema, WorkflowExecutionRequestSchema } from "./agent.schemas";

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

describe("GenerateOptionsSchema", () => {
  it("accepts options.memory envelope with nested runtime overrides", () => {
    const payload = {
      memory: {
        userId: "user-1",
        conversationId: "conv-1",
        options: {
          contextLimit: 12,
          readOnly: true,
          messageMetadataPersistence: {
            usage: true,
            finishReason: true,
          },
          semanticMemory: {
            enabled: true,
            semanticLimit: 4,
            semanticThreshold: 0.8,
            mergeStrategy: "append",
          },
          conversationPersistence: {
            mode: "step",
            debounceMs: 150,
            flushOnToolResult: true,
          },
        },
      },
    };

    const result = GenerateOptionsSchema.parse(payload);

    expect(result.memory?.userId).toBe("user-1");
    expect(result.memory?.conversationId).toBe("conv-1");
    expect(result.memory?.options?.contextLimit).toBe(12);
    expect(result.memory?.options?.readOnly).toBe(true);
    expect(result.memory?.options?.messageMetadataPersistence).toEqual({
      usage: true,
      finishReason: true,
    });
    expect(result.memory?.options?.semanticMemory?.enabled).toBe(true);
    expect(result.memory?.options?.semanticMemory?.semanticLimit).toBe(4);
    expect(result.memory?.options?.semanticMemory?.semanticThreshold).toBe(0.8);
    expect(result.memory?.options?.semanticMemory?.mergeStrategy).toBe("append");
    expect(result.memory?.options?.conversationPersistence?.mode).toBe("step");
    expect(result.memory?.options?.conversationPersistence?.debounceMs).toBe(150);
    expect(result.memory?.options?.conversationPersistence?.flushOnToolResult).toBe(true);
  });

  it("keeps legacy top-level memory fields for backward compatibility", () => {
    const payload = {
      userId: "legacy-user",
      conversationId: "legacy-conv",
      contextLimit: 10,
      semanticMemory: {
        enabled: true,
      },
      conversationPersistence: {
        mode: "finish",
      },
      messageMetadataPersistence: true,
    };

    expect(() => GenerateOptionsSchema.parse(payload)).not.toThrow();
  });

  it("rejects invalid nested memory.options values", () => {
    const payload = {
      memory: {
        userId: "user-1",
        conversationId: "conv-1",
        options: {
          contextLimit: "12",
          semanticMemory: {
            mergeStrategy: "invalid-strategy",
          },
        },
      },
    };

    expect(() => GenerateOptionsSchema.parse(payload)).toThrow();
  });
});
