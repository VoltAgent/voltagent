import { describe, expect, it } from "vitest";
import { createInputGuardrail, createOutputGuardrail } from "../../agent/guardrail";
import { createMockWorkflowExecuteContext } from "../../test-utils";
import { andGuardrail } from "./and-guardrail";

describe("andGuardrail", () => {
  it("applies output guardrails to data", async () => {
    const redact = createOutputGuardrail<string>({
      name: "redact",
      handler: async ({ output }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: output.replace(/[0-9]/g, "*"),
      }),
    });

    const step = andGuardrail({
      id: "guard-output",
      outputGuardrails: [redact],
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: "Code 123",
      }),
    );

    expect(result).toBe("Code ***");
  });

  it("applies input guardrails to string data", async () => {
    const trim = createInputGuardrail({
      name: "trim",
      handler: async ({ input }) => ({
        pass: true,
        action: "modify",
        modifiedInput: typeof input === "string" ? input.trim() : input,
      }),
    });

    const step = andGuardrail({
      id: "guard-input",
      inputGuardrails: [trim],
    });

    const result = await step.execute(
      createMockWorkflowExecuteContext({
        data: "  hello  ",
      }),
    );

    expect(result).toBe("hello");
  });
});
