import type { Agent } from "@voltagent/core";
import { describe, expect, it, vi } from "vitest";
import { AgentAdapter } from "./agent";

function createAgent(generateText: ReturnType<typeof vi.fn>): Agent {
  return {
    id: "support-agent",
    name: "Support Agent",
    purpose: "Answer support questions",
    instructions: "Be concise",
    generateText,
  } as unknown as Agent;
}

describe("AgentAdapter", () => {
  it("executes agents through positional generateText prompt and options", async () => {
    const generateText = vi.fn(async () => ({
      text: "Agent response",
      finishReason: "stop",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
    }));

    const result = await AgentAdapter.executeAgent(createAgent(generateText), {
      prompt: "Hello",
      context: { tenant: "acme" },
      conversationId: "conv-1",
      userId: "user-1",
      maxSteps: 3,
    });

    expect(generateText).toHaveBeenCalledTimes(1);
    const [prompt, options] = generateText.mock.calls[0];
    expect(prompt).toBe("Hello");
    expect(options).toEqual(
      expect.objectContaining({
        conversationId: "conv-1",
        userId: "user-1",
        maxSteps: 3,
        context: { tenant: "acme" },
      }),
    );
    expect(options).not.toHaveProperty("prompt");
    expect(options).not.toHaveProperty("messages");

    expect(result.content[0]).toEqual(expect.objectContaining({ type: "text" }));
    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain("Agent response");
    expect(text).toContain("finishReason");
  });

  it("bridges elicitation through generateText options without changing the prompt shape", async () => {
    const generateText = vi.fn(async () => ({
      text: "Needs approval",
      finishReason: "stop",
      usage: undefined,
    }));
    const elicitationResult = { action: "accept", content: { approved: true } };
    const requestElicitation = vi.fn(async () => elicitationResult);

    await AgentAdapter.executeAgent(
      createAgent(generateText),
      {
        prompt: "Approve this?",
        conversationId: "conv-2",
      },
      requestElicitation,
    );

    const [prompt, options] = generateText.mock.calls[0];
    expect(prompt).toBe("Approve this?");
    expect(options).not.toHaveProperty("prompt");
    expect(options.elicitation).toEqual(expect.any(Function));

    const request = {
      message: "Can I continue?",
      requestedSchema: { type: "object", properties: {} },
    };
    await expect(options.elicitation(request)).resolves.toBe(elicitationResult);
    expect(requestElicitation).toHaveBeenCalledWith(request);
  });
});
