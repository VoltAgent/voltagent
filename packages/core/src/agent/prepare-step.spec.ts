import { describe, expect, it, vi } from "vitest";
import { Agent } from "./agent";
import { createMockLanguageModel, defaultMockResponse } from "./test-utils";

describe("prepareStep", () => {
  it("should accept prepareStep in AgentOptions", () => {
    const prepareStep = vi.fn(() => ({}));
    const model = createMockLanguageModel();

    const agent = new Agent({
      name: "test-agent",
      instructions: "test",
      model,
      prepareStep,
    });

    expect(agent.prepareStep).toBe(prepareStep);
  });

  it("should default to undefined when prepareStep is not provided", () => {
    const model = createMockLanguageModel();

    const agent = new Agent({
      name: "test-agent",
      instructions: "test",
      model,
    });

    expect(agent.prepareStep).toBeUndefined();
  });

  it("should pass agent-level prepareStep to generateText", async () => {
    const prepareStep = vi.fn(() => ({}));
    const model = createMockLanguageModel({
      doGenerate: {
        ...defaultMockResponse,
        content: [{ type: "text", text: "done" }],
      },
    });

    const agent = new Agent({
      name: "test-agent",
      instructions: "test",
      model,
      prepareStep,
    });

    await agent.generateText("hello");

    // prepareStep is called by the AI SDK on each step
    expect(prepareStep).toHaveBeenCalled();
  });

  it("should pass agent-level prepareStep to streamText", async () => {
    const prepareStep = vi.fn(() => ({}));
    const model = createMockLanguageModel();

    const agent = new Agent({
      name: "test-agent",
      instructions: "test",
      model,
      prepareStep,
    });

    const result = await agent.streamText("hello");
    // consume the stream to completion
    for await (const _part of result.textStream) {
      // drain
    }

    expect(prepareStep).toHaveBeenCalled();
  });

  it("should allow per-call prepareStep to override agent-level", async () => {
    const agentPrepareStep = vi.fn(() => ({}));
    const callPrepareStep = vi.fn(() => ({}));
    const model = createMockLanguageModel({
      doGenerate: {
        ...defaultMockResponse,
        content: [{ type: "text", text: "done" }],
      },
    });

    const agent = new Agent({
      name: "test-agent",
      instructions: "test",
      model,
      prepareStep: agentPrepareStep,
    });

    await agent.generateText("hello", {
      prepareStep: callPrepareStep,
    });

    // per-call should be used, not agent-level
    expect(callPrepareStep).toHaveBeenCalled();
    expect(agentPrepareStep).not.toHaveBeenCalled();
  });

  it("should allow per-call prepareStep to override agent-level in streamText", async () => {
    const agentPrepareStep = vi.fn(() => ({}));
    const callPrepareStep = vi.fn(() => ({}));
    const model = createMockLanguageModel();

    const agent = new Agent({
      name: "test-agent",
      instructions: "test",
      model,
      prepareStep: agentPrepareStep,
    });

    const result = await agent.streamText("hello", {
      prepareStep: callPrepareStep,
    });
    for await (const _part of result.textStream) {
      // drain
    }

    expect(callPrepareStep).toHaveBeenCalled();
    expect(agentPrepareStep).not.toHaveBeenCalled();
  });
});
