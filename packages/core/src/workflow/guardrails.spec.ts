import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { createInputGuardrail, createOutputGuardrail } from "../agent/guardrail";
import { createWorkflowChain } from "./chain";
import { WorkflowRegistry } from "./registry";

describe("workflow guardrails", () => {
  beforeEach(() => {
    const registry = WorkflowRegistry.getInstance();
    (registry as any).workflows.clear();
  });

  it("applies input guardrails before execution", async () => {
    const trim = createInputGuardrail({
      name: "trim",
      handler: async ({ input }) => ({
        pass: true,
        action: "modify",
        modifiedInput: typeof input === "string" ? input.trim() : input,
      }),
    });

    const workflow = createWorkflowChain({
      id: "guardrail-input",
      name: "Guardrail Input",
      input: z.string(),
      result: z.string(),
      inputGuardrails: [trim],
    }).andThen({
      id: "echo",
      execute: async ({ data }) => `${data}-done`,
    });

    const result = await workflow.run("  hello  ");

    expect(result.result).toBe("hello-done");
  });

  it("applies output guardrails after execution", async () => {
    const redact = createOutputGuardrail<string>({
      name: "redact",
      handler: async ({ output }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: output.replace(/[0-9]/g, "*"),
      }),
    });

    const workflow = createWorkflowChain({
      id: "guardrail-output",
      name: "Guardrail Output",
      input: z.string(),
      result: z.string(),
      outputGuardrails: [redact],
    }).andThen({
      id: "echo",
      execute: async ({ data }) => data,
    });

    const result = await workflow.run("Code 123");

    expect(result.result).toBe("Code ***");
  });

  it("returns an error result when input guardrails block execution", async () => {
    const block = createInputGuardrail({
      name: "block",
      handler: async () => ({ pass: false, message: "Blocked" }),
    });

    const workflow = createWorkflowChain({
      id: "guardrail-block",
      name: "Guardrail Block",
      input: z.string(),
      result: z.string(),
      inputGuardrails: [block],
    }).andThen({
      id: "echo",
      execute: async ({ data }) => data,
    });

    const result = await workflow.run("bad");

    expect(result.status).toBe("error");
    expect(result.error).toMatchObject({
      code: "GUARDRAIL_INPUT_BLOCKED",
    });
  });
});
