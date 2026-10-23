import { safeStringify } from "@voltagent/internal/utils";
import { MockLanguageModelV3, simulateReadableStream } from "ai/test";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { z } from "zod";
import { VoltAgentObservability } from "../../observability";
import { AgentRegistry } from "../../registries/agent-registry";
import { Agent } from "../agent";
import { SubAgentManager } from "./index";

const expected = { answer: "ready", count: 7 };
const schema = z.object({ answer: z.string(), count: z.number() }).strict();
const finishReason = { unified: "stop", raw: "stop" } as const;
const usage = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
};

function createAgent(output: unknown = expected) {
  const text = safeStringify(output);
  return new Agent({
    name: "Structured child",
    instructions: "Return the requested output.",
    memory: false,
    model: new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: "text", text }],
        finishReason,
        usage,
        warnings: [],
      }),
      doStream: async () => ({
        stream: simulateReadableStream({
          chunks: [
            { type: "text-start", id: "text-1" },
            { type: "text-delta", id: "text-1", delta: text },
            { type: "text-end", id: "text-1" },
            { type: "finish", finishReason, usage },
          ],
        }),
      }),
    }),
  });
}

describe("structured subagent handoff", () => {
  let observability: VoltAgentObservability;

  beforeAll(() => {
    observability = new VoltAgentObservability({ serviceName: "structured-handoff-test" });
    AgentRegistry.getInstance().setGlobalObservability(observability);
  });

  afterAll(async () => {
    await observability.shutdown();
  });

  it.each([
    { output: expected, outputSchema: schema },
    {
      output: { object: { answer: "nested" }, usage: "application data" },
      outputSchema: z
        .object({ object: z.object({ answer: z.string() }), usage: z.string() })
        .strict(),
    },
  ])(
    "returns the generated object without its response envelope: $output",
    async ({ output, outputSchema }) => {
      const agent = createAgent(output);
      const direct = await agent.generateObject("Create the output", outputSchema);
      expect(direct.object).toEqual(output);
      expect(direct.usage).toEqual(expect.objectContaining({ totalTokens: 15 }));

      const manager = new SubAgentManager("Supervisor");
      const result = await manager.handoffTask({
        task: "Create the output",
        targetAgent: { agent, method: "generateObject", schema: outputSchema },
      });

      expect(JSON.parse(result.result)).toEqual(output);
      expect(outputSchema.parse(JSON.parse(result.result))).toEqual(output);
      expect(result.messages.at(-1)?.parts).toEqual([
        { type: "text", text: safeStringify(output) },
      ]);
      expect(result.usage).toEqual(direct.usage);
    },
  );

  it("passes only the generated object through delegate_task and the handoff hook", async () => {
    const agent = createAgent();
    const hookResults: string[] = [];
    const supervisor = new Agent({
      name: "Supervisor",
      instructions: "Coordinate structured tasks.",
      model: new MockLanguageModelV3(),
      memory: false,
      hooks: {
        onHandoffComplete: ({ result }) => {
          hookResults.push(result);
        },
      },
    });
    const manager = new SubAgentManager("Supervisor", [
      { agent, method: "generateObject", schema },
    ]);
    const tool = manager.createDelegateTool({ sourceAgent: supervisor });
    const result = await tool.execute?.({ task: "Create the output", targetAgents: [agent.name] });

    expect(result).toEqual([
      expect.objectContaining({
        agentName: agent.name,
        response: safeStringify(expected),
        usage: expect.objectContaining({ totalTokens: 15 }),
      }),
    ]);
    expect(hookResults).toEqual([safeStringify(expected)]);
  });

  it("preserves the generated object for streamObject handoffs", async () => {
    const manager = new SubAgentManager("Supervisor");
    const result = await manager.handoffTask({
      task: "Create the output",
      targetAgent: { agent: createAgent(), method: "streamObject", schema },
    });
    expect(JSON.parse(result.result)).toEqual(expected);
  });

  it("preserves text and usage for generateText handoffs", async () => {
    const manager = new SubAgentManager("Supervisor");
    const result = await manager.handoffTask({
      task: "Create the output",
      targetAgent: { agent: createAgent(), method: "generateText" },
    });
    expect(result.result).toBe(safeStringify(expected));
    expect(result.usage).toEqual(expect.objectContaining({ totalTokens: 15 }));
  });
});
