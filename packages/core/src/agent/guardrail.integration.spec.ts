import { describe, expect, it, vi } from "vitest";
import { convertUsage } from "../utils/usage-converter";
import { Agent } from "./agent";
import { createOutputGuardrail } from "./guardrail";
import type { VoltAgentTextStreamPart } from "./subagent/types";
import {
  collectStream,
  collectTextStream,
  convertArrayToReadableStream,
  createMockLanguageModel,
  defaultMockResponse,
} from "./test-utils";
import type { OutputGuardrailStreamArgs } from "./types";

describe("Agent guardrail integration", () => {
  it("sanitizes generateText output and forwards metadata to guardrails", async () => {
    const primaryGuardrail = createOutputGuardrail({
      id: "funding-filter",
      name: "Funding Filter",
      handler: vi.fn(async ({ outputText }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: (outputText as string).replace(/\$\d[\d.,]*/gi, "$[redacted]"),
      })),
    });

    const suffixGuardrail = createOutputGuardrail({
      id: "suffix",
      name: "Suffix Guardrail",
      handler: vi.fn(async ({ outputText }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: `${outputText} 🚫`,
      })),
    });

    const model = createMockLanguageModel({
      doGenerate: {
        ...defaultMockResponse,
        finishReason: "stop",
        content: [{ type: "text", text: "Funding: $987 million USD" }],
        warnings: ["trimmed"],
      },
    });

    const agent = new Agent({
      name: "Guarded Agent",
      instructions: "Return funding details.",
      model,
      outputGuardrails: [primaryGuardrail, suffixGuardrail],
    });

    const result = await agent.generateText("How much funding?");

    expect(result.text).toBe("Funding: $[redacted] million USD 🚫");
    expect(result.usage).toEqual(defaultMockResponse.usage);
    expect(result.context).toBeInstanceOf(Map);

    expect(primaryGuardrail.handler).toHaveBeenCalledTimes(1);
    const guardrailArgs = (primaryGuardrail.handler as vi.Mock).mock.calls[0][0];
    expect(guardrailArgs.originalOutputText).toBe("Funding: $987 million USD");
    expect(guardrailArgs.usage).toEqual(convertUsage(defaultMockResponse.usage));
    expect(guardrailArgs.finishReason).toBe("stop");
    expect(guardrailArgs.warnings).toEqual(["trimmed"]);
  });

  it("sanitizes streamed output across chunks and preserves sanitized finish text", async () => {
    const guardrailHandler = vi.fn(async ({ outputText }) => ({
      pass: true,
      action: "modify",
      modifiedOutput: (outputText as string).replace(/\d[\d\s.,]*/g, "[redacted digits]"),
    }));

    const streamGuardrail = createOutputGuardrail({
      id: "stream-funding",
      name: "Stream Funding Filter",
      handler: guardrailHandler,
      streamHandler: ({ part }: OutputGuardrailStreamArgs<string>) => {
        if (part.type !== "text-delta") {
          return part;
        }
        const chunk = part.text ?? (part as { delta?: string }).delta ?? "";
        if (!chunk) return part;
        const sanitized = chunk.replace(/\d[\d.,]*/g, "[redacted digits]");
        if (sanitized === chunk) {
          return part;
        }
        return { ...part, text: sanitized, delta: sanitized };
      },
    });

    const model = createMockLanguageModel({
      doStream: {
        stream: convertArrayToReadableStream([
          { type: "text-start" as const, id: "text-1" },
          {
            type: "text-delta" as const,
            id: "text-1",
            delta: "Funding: $",
            text: "Funding: $",
          },
          {
            type: "text-delta" as const,
            id: "text-1",
            delta: "123 million USD",
            text: "123 million USD",
          },
          {
            type: "finish" as const,
            finishReason: "stop",
            usage: defaultMockResponse.usage,
            totalUsage: defaultMockResponse.usage,
          },
        ]),
        rawCall: { rawPrompt: null, rawSettings: {} },
        usage: Promise.resolve(defaultMockResponse.usage),
        warnings: [],
      },
    });

    const agent = new Agent({
      name: "Streaming Guarded Agent",
      instructions: "Stream funding details.",
      model,
      outputGuardrails: [streamGuardrail],
    });

    const streamResult = await agent.streamText("Funding update?");

    const streamedText = await collectTextStream(streamResult.textStream);
    expect(streamedText).toContain("Funding:");
    expect(streamedText).toContain("[redacted digits]");
    expect(streamedText).not.toMatch(/\d/);

    const fullChunks = await collectStream<VoltAgentTextStreamPart<string>>(
      streamResult.fullStream,
    );
    const emittedText = fullChunks
      .filter((chunk) => chunk.type === "text-delta")
      .map((chunk) => chunk.delta ?? chunk.text ?? "")
      .join("");
    expect(emittedText).toContain("Funding:");
    expect(emittedText).toContain("[redacted digits]");
    expect(emittedText).not.toMatch(/\d/);

    const finalText = await streamResult.text;
    expect(finalText).toContain("Funding:");
    expect(finalText).toContain("[redacted digits]");
    expect(finalText).not.toMatch(/\d/);

    expect(guardrailHandler).toHaveBeenCalledTimes(1);
    const callArgs = (guardrailHandler as vi.Mock).mock.calls[0][0];
    const normalizedUsage =
      callArgs.usage && "inputTokens" in callArgs.usage
        ? convertUsage(callArgs.usage)
        : callArgs.usage;
    expect(normalizedUsage).toEqual(convertUsage(defaultMockResponse.usage));
    expect(callArgs.finishReason).toBe("stop");
  });
});
