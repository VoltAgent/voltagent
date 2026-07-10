import { describe, expect, it, vi } from "vitest";
import { Memory } from "../memory";
import { InMemoryStorageAdapter } from "../memory/adapters/storage/in-memory";
import { convertUsage } from "../utils/usage-converter";
import { Agent } from "./agent";
import { createInputGuardrail, createOutputGuardrail } from "./guardrail";
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
  const createStreamingModel = (text: string) =>
    createMockLanguageModel({
      doStream: () => ({
        stream: convertArrayToReadableStream([
          { type: "text-start" as const, id: "text-1" },
          {
            type: "text-delta" as const,
            id: "text-1",
            delta: text,
            text,
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
      }),
    });

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

    const fullChunks = await collectStream<VoltAgentTextStreamPart<string>>(streamResult.stream);
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

  it("holds streamed output until parallel input guardrails pass", async () => {
    let releaseGuardrail!: () => void;
    let markGuardrailStarted!: () => void;
    const guardrailStarted = new Promise<void>((resolve) => {
      markGuardrailStarted = resolve;
    });
    const inputGuardrail = createInputGuardrail({
      name: "async-input-check",
      execution: "parallel",
      handler: vi.fn(async () => {
        markGuardrailStarted();
        await new Promise<void>((release) => {
          releaseGuardrail = release;
        });
        return { pass: true };
      }),
    });

    const model = createMockLanguageModel({
      doStream: {
        stream: convertArrayToReadableStream([
          { type: "text-start" as const, id: "text-1" },
          {
            type: "text-delta" as const,
            id: "text-1",
            delta: "guarded output",
            text: "guarded output",
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
      name: "Parallel Guardrail Agent",
      instructions: "Stream response.",
      model,
      inputGuardrails: [inputGuardrail],
    });

    const streamResult = await agent.streamText("hello");
    const textPromise = collectTextStream(streamResult.textStream);
    await guardrailStarted;
    releaseGuardrail();
    await expect(textPromise).resolves.toBe("guarded output");
  });

  it("replaces blocked parallel input streams and skips assistant memory persistence", async () => {
    let releaseGuardrail!: () => void;
    let markGuardrailStarted!: () => void;
    const guardrailStarted = new Promise<void>((resolve) => {
      markGuardrailStarted = resolve;
    });
    const inputGuardrail = createInputGuardrail({
      name: "async-blocker",
      execution: "parallel",
      handler: vi.fn(async () => {
        markGuardrailStarted();
        await new Promise<void>((release) => {
          releaseGuardrail = release;
        });
        return { pass: false, action: "block", message: "Blocked by async input guardrail." };
      }),
    });

    const model = createMockLanguageModel({
      doStream: {
        stream: convertArrayToReadableStream([
          { type: "text-start" as const, id: "text-1" },
          {
            type: "text-delta" as const,
            id: "text-1",
            delta: "unsafe model output",
            text: "unsafe model output",
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

    const memory = new Memory({
      storage: new InMemoryStorageAdapter(),
    });
    const saveSpy = vi.spyOn(memory, "saveMessageWithContext");
    const agent = new Agent({
      name: "Blocking Parallel Guardrail Agent",
      instructions: "Stream response.",
      model,
      memory,
      inputGuardrails: [inputGuardrail],
    });

    const streamResult = await agent.streamText("hello", {
      userId: "user-1",
      conversationId: "conv-1",
    });
    const textPromise = collectTextStream(streamResult.textStream);

    await guardrailStarted;
    releaseGuardrail();

    await expect(textPromise).resolves.toBe("Blocked by async input guardrail.");
    await expect(streamResult.text).resolves.toBe("Blocked by async input guardrail.");
    expect(saveSpy).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: "assistant" }),
    );
    const savedMessages = await memory.getMessages("user-1", "conv-1");
    expect(savedMessages.some((message) => message.role === "assistant")).toBe(false);
  });

  it("replaces blocked parallel input full and UI streams", async () => {
    const inputGuardrail = createInputGuardrail({
      id: "input-policy",
      name: "async-stream-blocker",
      severity: "critical",
      execution: "parallel",
      handler: vi.fn(async () => ({
        pass: false,
        action: "block",
        message: "Input blocked before display.",
      })),
    });

    const agent = new Agent({
      name: "Blocked Stream Surfaces Agent",
      instructions: "Stream response.",
      model: createStreamingModel("unsafe model output"),
      inputGuardrails: [inputGuardrail],
    });

    const fullStreamResult = await agent.streamText("hello");
    const fullChunks = await collectStream<VoltAgentTextStreamPart<string>>(
      fullStreamResult.stream,
    );
    const fullStreamText = fullChunks
      .filter((chunk) => chunk.type === "text-delta")
      .map((chunk) => chunk.delta ?? chunk.text ?? "")
      .join("");
    expect(fullStreamText).toBe("Input blocked before display.");
    expect(fullStreamText).not.toContain("unsafe model output");
    expect(fullChunks.some((chunk) => chunk.type === "finish")).toBe(true);
    const fullFinish = fullChunks.find((chunk) => chunk.type === "finish");
    expect(fullFinish).toMatchObject({ finishReason: "error" });
    const fullBlockEvent = fullChunks.find(
      (chunk) => chunk.type === "input-guardrail-blocked",
    ) as any;
    expect(fullBlockEvent?.data).toMatchObject({
      code: "GUARDRAIL_INPUT_BLOCKED",
      reason: "input_guardrail_blocked",
      message: "Input blocked before display.",
      guardrailId: "input-policy",
      guardrailName: "async-stream-blocker",
      severity: "critical",
    });

    const uiStreamResult = await agent.streamText("hello");
    const uiChunks = await collectStream(uiStreamResult.toUIMessageStream());
    const uiStreamText = uiChunks
      .filter((chunk) => chunk.type === "text-delta")
      .map((chunk) => chunk.delta ?? "")
      .join("");
    expect(uiStreamText).toBe("Input blocked before display.");
    expect(uiStreamText).not.toContain("unsafe model output");
    expect(uiChunks.some((chunk) => chunk.type === "finish")).toBe(true);
    const uiFinish = uiChunks.find((chunk) => chunk.type === "finish");
    expect(uiFinish).toMatchObject({ finishReason: "error" });
    const uiBlockEvent = uiChunks.find((chunk) => chunk.type === "data-input-guardrail-blocked");
    expect(uiBlockEvent?.data).toMatchObject({
      code: "GUARDRAIL_INPUT_BLOCKED",
      reason: "input_guardrail_blocked",
      message: "Input blocked before display.",
      guardrailId: "input-policy",
      guardrailName: "async-stream-blocker",
      severity: "critical",
    });
  });

  it("keeps parallel input block messages ahead of output guardrail transforms", async () => {
    let releaseGuardrail!: () => void;
    let markGuardrailStarted!: () => void;
    const guardrailStarted = new Promise<void>((resolve) => {
      markGuardrailStarted = resolve;
    });
    const inputGuardrail = createInputGuardrail({
      name: "async-input-blocker",
      execution: "parallel",
      handler: vi.fn(async () => {
        markGuardrailStarted();
        await new Promise<void>((release) => {
          releaseGuardrail = release;
        });
        return { pass: false, action: "block", message: "Input policy blocked this request." };
      }),
    });
    const outputGuardrail = createOutputGuardrail({
      name: "output-transform",
      handler: vi.fn(async ({ outputText }) => ({
        pass: true,
        action: "modify",
        modifiedOutput: `output transformed: ${outputText}`,
      })),
      streamHandler: ({ part }: OutputGuardrailStreamArgs<string>) => {
        if (part.type !== "text-delta") {
          return part;
        }
        return {
          ...part,
          text: "output transformed",
          delta: "output transformed",
        };
      },
    });

    const model = createMockLanguageModel({
      doStream: {
        stream: convertArrayToReadableStream([
          { type: "text-start" as const, id: "text-1" },
          {
            type: "text-delta" as const,
            id: "text-1",
            delta: "model output",
            text: "model output",
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
      name: "Input Override Agent",
      instructions: "Stream response.",
      model,
      inputGuardrails: [inputGuardrail],
      outputGuardrails: [outputGuardrail],
    });

    const streamResult = await agent.streamText("hello");
    const textPromise = collectTextStream(streamResult.textStream);

    await guardrailStarted;
    releaseGuardrail();

    await expect(textPromise).resolves.toBe("Input policy blocked this request.");
    await expect(streamResult.text).resolves.toBe("Input policy blocked this request.");
  });
});
