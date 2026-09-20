import { type Context, ROOT_CONTEXT } from "@opentelemetry/api";
import type { ReadableSpan, Span as SDKSpan } from "@opentelemetry/sdk-trace-base";
import { describe, expect, it, vi } from "vitest";
import { VoltAgentLangfuseProcessor } from "./exporter";

const createSpan = (
  instrumentationScope: string,
  attributes: Record<string, unknown> = {},
): SDKSpan => {
  const span = {
    spanContext: () => ({
      traceId: "trace-id",
      spanId: "span-id",
      traceFlags: 1,
      isRemote: false,
      traceState: undefined,
    }),
    resource: { attributes: {} },
    instrumentationScope: { name: instrumentationScope },
    attributes: { ...attributes },
    events: [],
    links: [],
    startTime: [0, 0],
    endTime: [0, 0],
    droppedAttributesCount: 0,
    droppedEventsCount: 0,
    droppedLinksCount: 0,
    duration: [0, 0],
    status: { code: 0 },
    name: "test-span",
    kind: 0,
    parentSpanId: undefined,
    addEvent: vi.fn(),
    end: vi.fn(),
    isRecording: vi.fn().mockReturnValue(true),
    recordException: vi.fn(),
    setAttribute: vi.fn((key: string, value: unknown) => {
      (span.attributes as Record<string, unknown>)[key] = value;
    }),
    setAttributes: vi.fn(),
    setStatus: vi.fn(),
    updateName: vi.fn(),
  };

  return span as unknown as SDKSpan;
};

const noopContext = ROOT_CONTEXT as Context;

describe("VoltAgentLangfuseProcessor", () => {
  describe("attribute normalisation", () => {
    it("maps ai.* attributes to gen_ai.* conventions", () => {
      const processor = new VoltAgentLangfuseProcessor();
      const span = createSpan("ai", {
        "ai.model.id": "gpt-4o-mini",
        "ai.response.text": "hello",
        "ai.usage.promptTokens": 12,
        "ai.usage.completionTokens": 34,
      });

      processor.onStart(span, noopContext);

      expect(span.attributes["gen_ai.request.model"]).toBe("gpt-4o-mini");
      expect(span.attributes["gen_ai.output.text"]).toBe("hello");
      expect(span.attributes["gen_ai.usage.input_tokens"]).toBe(12);
      expect(span.attributes["gen_ai.usage.output_tokens"]).toBe(34);
    });

    it("does not clobber an existing gen_ai.* value", () => {
      const processor = new VoltAgentLangfuseProcessor();
      const span = createSpan("ai", {
        "ai.model.id": "from-ai-sdk",
        "gen_ai.request.model": "from-upstream-instrumentor",
      });

      processor.onStart(span, noopContext);

      expect(span.attributes["gen_ai.request.model"]).toBe("from-upstream-instrumentor");
    });

    it("maps ai.model.id and ai.model.name to the same key without order dependence", () => {
      const processor = new VoltAgentLangfuseProcessor();
      const span = createSpan("ai", {
        "ai.model.name": "by-name",
        "ai.model.id": "by-id",
      });

      processor.onStart(span, noopContext);

      // Whichever source wins, the result must be one of the two inputs and
      // must be stable across runs — never undefined or a mix.
      expect(["by-name", "by-id"]).toContain(span.attributes["gen_ai.request.model"]);
    });

    it("maps VoltAgent tags to langfuse.trace.tags", () => {
      const arrayProcessor = new VoltAgentLangfuseProcessor();
      const arraySpan = createSpan("@voltagent/core", {
        tags: ["production", "v2"],
      });
      arrayProcessor.onStart(arraySpan, noopContext);
      expect(arraySpan.attributes["langfuse.trace.tags"]).toEqual(["production", "v2"]);

      const jsonProcessor = new VoltAgentLangfuseProcessor();
      const jsonSpan = createSpan("@voltagent/core", {
        "prompt.tags": '["alpha","beta"]',
      });
      jsonProcessor.onStart(jsonSpan, noopContext);
      expect(jsonSpan.attributes["langfuse.trace.tags"]).toEqual(["alpha", "beta"]);
    });

    it("maps enduser.id / conversation.id to the standard semconv keys", () => {
      const processor = new VoltAgentLangfuseProcessor();
      const span = createSpan("@voltagent/core", {
        "enduser.id": "user-1",
        "conversation.id": "session-1",
      });

      processor.onStart(span, noopContext);

      expect(span.attributes["user.id"]).toBe("user-1");
      expect(span.attributes["session.id"]).toBe("session-1");
    });

    it("normalises on end so attributes set late are still exported", () => {
      const processor = new VoltAgentLangfuseProcessor();
      const span = createSpan("@voltagent/core");
      const readable = span as unknown as ReadableSpan;
      (readable.attributes as Record<string, unknown>)["ai.model.id"] = "late-model";

      processor.onEnd(readable);

      expect(readable.attributes["gen_ai.request.model"]).toBe("late-model");
    });
  });

  describe("delegation", () => {
    it("forwards spans to the inner processor", () => {
      const processor = new VoltAgentLangfuseProcessor();

      const inner = (processor as unknown as { inner: { onEnd: unknown } }).inner;
      const spy = vi.spyOn(inner as { onEnd: (s: ReadableSpan) => void }, "onEnd");

      const span = createSpan("@voltagent/core");
      processor.onEnd(span as unknown as ReadableSpan);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe("shouldExportSpan override", () => {
    it("treats a caller-supplied predicate as the override", () => {
      const processor = new VoltAgentLangfuseProcessor({
        shouldExportSpan: () => false,
      });

      const inner = (
        processor as unknown as {
          inner: { shouldExportSpan: (p: { otelSpan: ReadableSpan }) => boolean };
        }
      ).inner;

      const span = createSpan("@voltagent/core") as unknown as ReadableSpan;

      // The caller asked for "export nothing", so even a VoltAgent span is
      // rejected — the predicate is not short-circuited by an `||`.
      expect(inner.shouldExportSpan({ otelSpan: span })).toBe(false);
    });

    it("widens the default filter to include VoltAgent scopes", () => {
      const processor = new VoltAgentLangfuseProcessor();

      const inner = (
        processor as unknown as {
          inner: { shouldExportSpan: (p: { otelSpan: ReadableSpan }) => boolean };
        }
      ).inner;

      const coreSpan = createSpan("@voltagent/core") as unknown as ReadableSpan;
      expect(inner.shouldExportSpan({ otelSpan: coreSpan })).toBe(true);
    });
  });

  describe("backward-compatible factory", () => {
    it("returns a working processor instance", async () => {
      const { createLangfuseSpanProcessor } = await import("./processor");
      const processor = createLangfuseSpanProcessor();

      expect(processor).toBeInstanceOf(VoltAgentLangfuseProcessor);
      expect(typeof processor.onStart).toBe("function");
      expect(typeof processor.onEnd).toBe("function");
      expect(typeof processor.forceFlush).toBe("function");
      expect(typeof processor.shutdown).toBe("function");
    });
  });
});
