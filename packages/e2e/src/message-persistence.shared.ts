import { Agent, type Memory, type Tool, createTool } from "@voltagent/core";
import { safeStringify } from "@voltagent/internal";
import type { UIMessage } from "ai";
import { MockLanguageModelV3 } from "ai/test";
import { expect, vi } from "vitest";
import { z } from "zod";

const turns = [
  { prompt: "Turn 1: fetch weather", topic: "weather", summary: "Turn 1 summary: weather saved." },
  {
    prompt: "Turn 2: add to calendar",
    topic: "calendar",
    summary: "Turn 2 summary: calendar saved.",
  },
  { prompt: "Turn 3: add to task list", topic: "tasks", summary: "Turn 3 summary: task saved." },
  {
    prompt: "Turn 4: summarize previous outputs",
    topic: "summary",
    summary: "Turn 4 summary: recap saved.",
  },
  {
    prompt: "Turn 5: summarize all conversation",
    topic: "final",
    summary: "Turn 5 summary: final recap saved.",
  },
] as const;

const usage = {
  inputTokens: {
    total: 120,
    noCache: 120,
    cacheRead: 0,
    cacheWrite: 0,
  },
  outputTokens: {
    total: 60,
    text: 30,
    reasoning: 30,
  },
};

const parseUnknownJson = (value: unknown): unknown => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return value;
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const unwrapJsonEnvelope = (value: unknown): unknown => {
  const parsed = parseUnknownJson(value);
  if (
    parsed &&
    typeof parsed === "object" &&
    (parsed as Record<string, unknown>).type === "json" &&
    "value" in (parsed as Record<string, unknown>)
  ) {
    return (parsed as Record<string, unknown>).value;
  }
  return parsed;
};

const getTurnExpectation = (turnNumber: number) => {
  const turn = turns[turnNumber - 1];
  if (!turn) {
    throw new Error(`Unexpected turn number for assertions: ${turnNumber}`);
  }
  return turn;
};

export const assertAssistantParts = (message: UIMessage, turnNumber: number) => {
  const turn = getTurnExpectation(turnNumber);
  const partTypes = message.parts.map((part) => part.type);

  expect(partTypes).toContain("reasoning");
  expect(partTypes).toContain("tool-lookup");
  expect(partTypes).toContain("text");

  const reasoningParts = message.parts.filter((part) => part.type === "reasoning") as Array<{
    type: "reasoning";
    text?: string;
  }>;
  expect(reasoningParts.length).toBeGreaterThan(0);
  expect(
    reasoningParts.some(
      (part) => typeof part.text === "string" && part.text.includes(`Turn ${turnNumber}:`),
    ),
  ).toBe(true);

  const toolLookupParts = message.parts.filter((part) => part.type === "tool-lookup") as Array<{
    type: "tool-lookup";
    toolCallId?: string;
    state?: string;
    input?: unknown;
    output?: unknown;
  }>;
  expect(toolLookupParts).toHaveLength(1);

  const toolPart = toolLookupParts[0];
  expect(toolPart.toolCallId).toBe(`lookup-call-${turnNumber}`);
  expect(toolPart.state).toBe("output-available");

  const parsedInput = unwrapJsonEnvelope(toolPart.input);
  expect(parsedInput).toMatchObject({
    topic: turn.topic,
    turn: turnNumber,
  });

  const parsedOutput = unwrapJsonEnvelope(toolPart.output);
  expect(parsedOutput).toMatchObject({
    ok: true,
    topic: turn.topic,
    turn: turnNumber,
  });

  const textParts = message.parts.filter((part) => part.type === "text") as Array<{
    type: "text";
    text?: string;
  }>;
  expect(textParts.length).toBeGreaterThan(0);
  expect(textParts.some((part) => part.text === turn.summary)).toBe(true);
};

const createAgent = (memory: Memory, model: MockLanguageModelV3, tool: Tool) =>
  new Agent({
    name: "persistence-e2e-agent",
    instructions: "Use tools and answer briefly.",
    model: model,
    tools: [tool],
    memory,
    conversationPersistence: {
      mode: "step",
      debounceMs: 0,
      flushOnToolResult: true,
    },
  });

export const runFiveTurns = async (memory: Memory, userId: string, conversationId: string) => {
  let generateCallCount = 0;
  let contextReplayChecks = 0;

  const toolExecute = vi.fn(async ({ topic, turn }: { topic: string; turn: number }) => ({
    ok: true,
    topic,
    turn,
  }));

  const tool = createTool({
    name: "lookup",
    description: "Lookup turn payload",
    parameters: z.object({
      topic: z.string(),
      turn: z.number(),
    }),
    execute: toolExecute,
  });

  const model = new MockLanguageModelV3({
    modelId: "mock-persistence-model",
    doGenerate: async (callOptions) => {
      generateCallCount += 1;
      const turnNumber = Math.ceil(generateCallCount / 2);
      const isToolStep = generateCallCount % 2 === 1;
      const turn = turns[turnNumber - 1];

      if (!turn) {
        throw new Error(`Unexpected turn number: ${turnNumber}`);
      }

      const promptSnapshot = safeStringify(callOptions.prompt);
      if (isToolStep && turnNumber > 1) {
        for (let previous = 1; previous < turnNumber; previous += 1) {
          const marker = `Turn ${previous} summary:`;
          if (!promptSnapshot.includes(marker)) {
            throw new Error(`Missing persisted marker "${marker}" in turn ${turnNumber}`);
          }
        }
        contextReplayChecks += 1;
      }

      if (isToolStep) {
        return {
          finishReason: {
            unified: "tool-calls",
            raw: undefined,
          },
          content: [
            {
              type: "reasoning",
              text: `Turn ${turnNumber}: calling lookup.`,
            },
            {
              type: "tool-call",
              toolCallId: `lookup-call-${turnNumber}`,
              toolName: "lookup",
              input: safeStringify({
                topic: turn.topic,
                turn: turnNumber,
              }),
            },
          ],
          usage,
          warnings: [],
        };
      }

      return {
        finishReason: {
          unified: "stop",
          raw: undefined,
        },
        content: [
          {
            type: "reasoning",
            text: `Turn ${turnNumber}: composing response.`,
          },
          {
            type: "text",
            text: turn.summary,
          },
        ],
        usage,
        warnings: [],
      };
    },
  });

  let agent = createAgent(memory, model, tool);

  for (const [index, turn] of turns.entries()) {
    if (index === turns.length - 1) {
      // Recreate agent to prove context is replayed from persistence.
      agent = createAgent(memory, model, tool);
    }

    const result = await agent.generateText(turn.prompt, {
      userId,
      conversationId,
    });
    expect(result.text).toBe(turn.summary);
  }

  expect(toolExecute).toHaveBeenCalledTimes(5);
  expect(generateCallCount).toBe(10);
  expect(contextReplayChecks).toBe(4);

  const allMessages = await memory.getMessages(userId, conversationId);
  const assistantMessages = allMessages.filter((message) => message.role === "assistant");
  expect(assistantMessages).toHaveLength(5);
  assistantMessages.forEach((message, index) => {
    assertAssistantParts(message, index + 1);
  });
};
