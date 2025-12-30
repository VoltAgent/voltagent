import type { Logger } from "@voltagent/internal";
import type { ModelMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  type NormalizedInputGuardrail,
  type NormalizedOutputGuardrail,
  createInputGuardrail,
  createOutputGuardrail,
  extractInputTextForGuardrail,
  extractOutputTextForGuardrail,
  getDefaultGuardrailName,
  normalizeGuardrailDefinition,
  normalizeInputGuardrailList,
  normalizeOutputGuardrailList,
  runInputGuardrails,
  runOutputGuardrails,
  serializeGuardrailValue,
} from "./guardrail";
import { createMockUIMessage, createTestAgent } from "./test-utils";
import type { OperationContext } from "./types";

const createMockSpan = () => ({
  setAttribute: vi.fn(),
  setStatus: vi.fn(),
  end: vi.fn(),
  recordException: vi.fn(),
});

type MockTraceContext = ReturnType<typeof createMockTraceContext>;

const createMockTraceContext = () => {
  const span = createMockSpan();
  return {
    spans: [] as Array<ReturnType<typeof createMockSpan>>,
    createChildSpan: vi.fn(() => {
      const child = createMockSpan();
      (child as any).parent = span;
      return child;
    }),
    withSpan: vi.fn(async (_span: any, fn: () => Promise<any> | any) => fn()),
    setInput: vi.fn(),
    setOutput: vi.fn(),
    end: vi.fn(),
  };
};

const createMockLogger = (): Logger =>
  ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }) as unknown as Logger;

const createOperationContext = (): OperationContext & { traceContext: MockTraceContext } => {
  const traceContext = createMockTraceContext();
  return {
    operationId: "op-1",
    context: new Map(),
    systemContext: new Map(),
    isActive: true,
    traceContext: traceContext as unknown as OperationContext["traceContext"],
    logger: createMockLogger(),
    abortController: new AbortController(),
    startTime: new Date(),
  } as OperationContext & { traceContext: MockTraceContext };
};

describe("guardrail helpers", () => {
  describe("getDefaultGuardrailName", () => {
    it("returns formatted name for input", () => {
      expect(getDefaultGuardrailName("input", 0)).toBe("Input Guardrail #1");
    });

    it("returns formatted name for output", () => {
      expect(getDefaultGuardrailName("output", 2)).toBe("Output Guardrail #3");
    });
  });

  describe("normalizeGuardrailDefinition", () => {
    it("normalizes guardrail function metadata", () => {
      const handler = vi.fn(async () => ({ pass: true })) as any;
      handler.guardrailId = "fn-id";
      handler.guardrailName = "Fn Guardrail";
      handler.guardrailDescription = "desc";
      handler.guardrailTags = ["tag1"];
      handler.guardrailSeverity = "critical";

      const normalized = normalizeGuardrailDefinition(handler, "input", 0);
      expect(normalized).toMatchObject({
        id: "fn-id",
        name: "Fn Guardrail",
        description: "desc",
        tags: ["tag1"],
        severity: "critical",
      });
      expect(typeof normalized.handler).toBe("function");
    });

    it("normalizes guardrail object definition", () => {
      const guardrail = {
        id: "obj-id",
        name: "Object Guardrail",
        description: "desc",
        tags: ["tag"],
        severity: "warning" as const,
        metadata: { level: 1 },
        handler: vi.fn(async () => ({ pass: true })),
      };

      const normalized = normalizeGuardrailDefinition(guardrail, "output", 1);
      expect(normalized).toMatchObject({
        id: "obj-id",
        name: "Object Guardrail",
        description: "desc",
        tags: ["tag"],
        severity: "warning",
        metadata: { level: 1 },
      });
    });
  });

  describe("normalize guardrail lists", () => {
    it("normalizes input guardrail list with start index", () => {
      const guardrails = normalizeInputGuardrailList(
        [{ handler: vi.fn(async () => ({ pass: true })) }] as any,
        2,
      );
      expect(guardrails[0].name).toBe("Input Guardrail #3");
    });

    it("normalizes output guardrail list", () => {
      const guardrails = normalizeOutputGuardrailList(
        [{ handler: vi.fn(async () => ({ pass: true })) }] as any,
        1,
      );
      expect(guardrails[0].name).toBe("Output Guardrail #2");
    });
  });

  describe("serializeGuardrailValue", () => {
    it("returns string values untouched", () => {
      expect(serializeGuardrailValue("hello")).toBe("hello");
    });

    it("stringifies objects", () => {
      expect(JSON.parse(serializeGuardrailValue({ a: 1 }))).toEqual({ a: 1 });
    });
  });

  describe("extractInputTextForGuardrail", () => {
    it("handles string input", async () => {
      await expect(extractInputTextForGuardrail("hello")).resolves.toBe("hello");
    });

    it("extracts from UI messages", async () => {
      const messages = [createMockUIMessage("user", "hello world")];
      await expect(extractInputTextForGuardrail(messages)).resolves.toBe("hello world");
    });

    it("extracts from model messages", async () => {
      const messages: ModelMessage[] = [
        { role: "user", content: "hi" },
        { role: "assistant", content: [{ type: "text", text: "reply" }] },
      ];
      await expect(extractInputTextForGuardrail(messages)).resolves.toBe("hi\nreply");
    });
  });

  describe("extractOutputTextForGuardrail", () => {
    it("returns string as-is", async () => {
      await expect(extractOutputTextForGuardrail("output")).resolves.toBe("output");
    });

    it("serializes objects", async () => {
      const text = await extractOutputTextForGuardrail({ foo: "bar" });
      expect(text && JSON.parse(text)).toEqual({ foo: "bar" });
    });
  });

  describe("runInputGuardrails", () => {
    let oc: ReturnType<typeof createOperationContext>;
    const agent = createTestAgent();

    beforeEach(() => {
      oc = createOperationContext();
    });

    it("returns original input when no guardrails", async () => {
      const result = await runInputGuardrails("hello", oc, [], "generateText", agent);
      expect(result).toBe("hello");
      expect(oc.traceContext.setInput).not.toHaveBeenCalled();
    });

    it("provides inputText to guardrail handlers", async () => {
      const handler = vi.fn(async () => ({ pass: true }));
      const guardrails: NormalizedInputGuardrail[] = [{ name: "test", handler }];

      await runInputGuardrails(
        [createMockUIMessage("user", "hi there")],
        oc,
        guardrails,
        "generateText",
        agent,
      );
      expect(handler).toHaveBeenCalled();
      const args = handler.mock.calls[0][0];
      expect(args.inputText).toBe("hi there");
      expect(args.originalInputText).toBe("hi there");
    });

    it("applies modifications and updates trace context", async () => {
      const guardrails: NormalizedInputGuardrail[] = [
        {
          name: "modify",
          handler: vi.fn(async ({ inputText }) => ({
            pass: true,
            action: "modify",
            modifiedInput: inputText.toUpperCase(),
          })),
        },
      ];

      const result = await runInputGuardrails("hello", oc, guardrails, "generateText", agent);
      expect(result).toBe("HELLO");
      expect(oc.traceContext.setInput).toHaveBeenCalledWith("HELLO");
      expect(oc.logger.debug).toHaveBeenCalledWith("Input guardrail evaluated", expect.any(Object));
    });

    it("throws when guardrail blocks input", async () => {
      const guardrails: NormalizedInputGuardrail[] = [
        {
          name: "block",
          handler: vi.fn(async () => ({ pass: false, action: "block", message: "Blocked" })),
        },
      ];

      await expect(
        runInputGuardrails("bad", oc, guardrails, "generateText", agent),
      ).rejects.toThrow(/Blocked/);
      expect(oc.isActive).toBe(false);
      expect(oc.traceContext.end).toHaveBeenCalledWith("error", expect.any(Error));
    });
  });

  describe("runOutputGuardrails", () => {
    let oc: ReturnType<typeof createOperationContext>;
    const agent = createTestAgent();

    beforeEach(() => {
      oc = createOperationContext();
    });

    it("returns original output when no guardrails", async () => {
      const result = await runOutputGuardrails({
        output: "done",
        operationContext: oc,
        guardrails: [],
        operation: "generateText",
        agent,
      });
      expect(result).toBe("done");
      expect(oc.traceContext.setOutput).not.toHaveBeenCalled();
    });

    it("applies modifications", async () => {
      const guardrails: NormalizedOutputGuardrail[] = [
        {
          name: "redact",
          handler: vi.fn(async () => ({
            pass: true,
            action: "modify",
            modifiedOutput: "clean",
          })),
        },
      ];

      const result = await runOutputGuardrails({
        output: "dirty",
        operationContext: oc,
        guardrails,
        operation: "generateText",
        agent,
        metadata: { usage: { tokens: 10 } },
      });

      expect(result).toBe("clean");
      expect(oc.traceContext.setOutput).toHaveBeenCalledWith("clean");
      expect(oc.logger.debug).toHaveBeenCalledWith(
        "Output guardrail evaluated",
        expect.any(Object),
      );
    });

    it("throws when guardrail blocks output", async () => {
      const guardrails: NormalizedOutputGuardrail[] = [
        {
          name: "block",
          handler: vi.fn(async () => ({ pass: false, action: "block", message: "nope" })),
        },
      ];

      await expect(
        runOutputGuardrails({
          output: "bad",
          operationContext: oc,
          guardrails,
          operation: "generateText",
          agent,
        }),
      ).rejects.toThrow(/nope/);
      expect(oc.isActive).toBe(false);
      expect(oc.traceContext.end).toHaveBeenCalledWith("error", expect.any(Error));
    });

    it("applies guardrails sequentially in order", async () => {
      const guardrails: NormalizedOutputGuardrail[] = [
        {
          name: "uppercase",
          handler: vi.fn(async ({ outputText }) => ({
            pass: true,
            action: "modify",
            modifiedOutput: (outputText as string).toUpperCase(),
          })),
        },
        {
          name: "suffix",
          handler: vi.fn(async ({ outputText }) => ({
            pass: true,
            action: "modify",
            modifiedOutput: `${outputText} ✅`,
          })),
        },
      ];

      const result = await runOutputGuardrails({
        output: "funding ok",
        operationContext: oc,
        guardrails,
        operation: "generateText",
        agent,
      });

      expect(result).toBe("FUNDING OK ✅");
      const secondHandler = guardrails[1].handler as vi.Mock;
      expect(secondHandler).toHaveBeenCalledWith(
        expect.objectContaining({ outputText: "FUNDING OK" }),
      );
    });

    it("supplies metadata and original output to guardrail handlers", async () => {
      const guardrail = {
        name: "metadata-check",
        handler: vi.fn(async () => ({ pass: true })),
      };

      const metadata = {
        usage: {
          promptTokens: 5,
          completionTokens: 3,
          totalTokens: 8,
          cachedInputTokens: 0,
          reasoningTokens: 0,
        },
        finishReason: "stop" as const,
        warnings: ["trimmed"],
      };

      await runOutputGuardrails({
        output: "funding: [redacted]",
        operationContext: oc,
        guardrails: [guardrail],
        operation: "generateText",
        agent,
        metadata,
        originalOutputOverride: "funding: $123",
      });

      expect(guardrail.handler).toHaveBeenCalledTimes(1);
      const callArgs = (guardrail.handler as vi.Mock).mock.calls[0][0];
      expect(callArgs.usage).toEqual(metadata.usage);
      expect(callArgs.finishReason).toBe(metadata.finishReason);
      expect(callArgs.warnings).toEqual(metadata.warnings);
      expect(callArgs.originalOutputText).toBe("funding: $123");
      expect(callArgs.outputText).toBe("funding: $123");
    });

    it("createInputGuardrail helper preserves metadata and handler", () => {
      const helperGuardrail = createInputGuardrail({
        id: "helper-input",
        name: "Helper Input Guardrail",
        severity: "warning",
        handler: vi.fn(async () => ({ pass: true })),
      });

      const [normalized] = normalizeInputGuardrailList([helperGuardrail]);
      expect(normalized.name).toBe("Helper Input Guardrail");
      expect(normalized.severity).toBe("warning");
      expect(normalized.handler).toBe(helperGuardrail.handler);
    });

    it("createOutputGuardrail helper attaches stream handler", () => {
      const streamHandler = vi.fn();
      const helperGuardrail = createOutputGuardrail({
        id: "helper-output",
        name: "Helper Output Guardrail",
        handler: vi.fn(async () => ({ pass: true })),
        streamHandler,
      });

      const [normalized] = normalizeOutputGuardrailList([helperGuardrail]);
      expect(normalized.name).toBe("Helper Output Guardrail");
      expect(normalized.streamHandler).toBe(streamHandler);
      expect("handler" in helperGuardrail).toBe(true);
      if ("handler" in helperGuardrail) {
        expect(normalized.handler).toBe(helperGuardrail.handler);
      }
    });
  });
});
