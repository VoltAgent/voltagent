import type { Context } from "@opentelemetry/api";
import type { ReadableSpan, Span as SDKSpan, SpanProcessor } from "@opentelemetry/sdk-trace-base";
import { describe, expect, it, vi } from "vitest";
import { SpanFilterProcessor } from "./span-filter-processor";

const createDelegate = () => ({
  onStart: vi.fn(),
  onEnd: vi.fn(),
  shutdown: vi.fn().mockResolvedValue(undefined),
  forceFlush: vi.fn().mockResolvedValue(undefined),
});

const createSpan = (instrumentationScope: string, serviceName?: string): SDKSpan => {
  const spanContext = () => ({
    traceId: "trace-id",
    spanId: "span-id",
    traceFlags: 1,
    isRemote: false,
    traceState: undefined,
  });

  return {
    spanContext,
    resource: {
      attributes: {
        ...(serviceName ? { "service.name": serviceName } : {}),
      },
    },
    instrumentationScope: {
      name: instrumentationScope,
    },
    attributes: {},
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
    setAttribute: vi.fn(),
    setAttributes: vi.fn(),
    setStatus: vi.fn(),
    updateName: vi.fn(),
  } as unknown as SDKSpan;
};

const noopContext = {} as Context;

describe("SpanFilterProcessor", () => {
  it("forwards spans that match the instrumentation scope", () => {
    const delegate = createDelegate();
    const processor = new SpanFilterProcessor(delegate as unknown as SpanProcessor, {
      allowedInstrumentationScopes: ["@voltagent/core"],
    });

    const span = createSpan("@voltagent/core", "voltagent");

    processor.onStart(span, noopContext);
    processor.onEnd(span);

    expect(delegate.onStart).toHaveBeenCalledTimes(1);
    expect(delegate.onEnd).toHaveBeenCalledTimes(1);
  });

  it("drops spans with non-matching instrumentation scope", () => {
    const delegate = createDelegate();
    const processor = new SpanFilterProcessor(delegate as unknown as SpanProcessor, {
      allowedInstrumentationScopes: ["@voltagent/core"],
    });

    const span = createSpan("some-other-scope", "voltagent");

    processor.onStart(span, noopContext);
    processor.onEnd(span);

    expect(delegate.onStart).not.toHaveBeenCalled();
    expect(delegate.onEnd).not.toHaveBeenCalled();
  });

  it("applies service name filtering when specified", () => {
    const delegate = createDelegate();
    const processor = new SpanFilterProcessor(delegate as unknown as SpanProcessor, {
      allowedServiceNames: ["voltagent"],
    });

    const matchingSpan = createSpan("@voltagent/core", "voltagent");
    const nonMatchingSpan = createSpan("@voltagent/core", "other-service");

    processor.onStart(matchingSpan, noopContext);
    processor.onEnd(matchingSpan);
    processor.onStart(nonMatchingSpan, noopContext);
    processor.onEnd(nonMatchingSpan);

    expect(delegate.onStart).toHaveBeenCalledTimes(1);
    expect(delegate.onEnd).toHaveBeenCalledTimes(1);
  });

  it("allows custom predicates to override filtering", () => {
    const delegate = createDelegate();
    const processor = new SpanFilterProcessor(delegate as unknown as SpanProcessor, {
      allowedInstrumentationScopes: ["blocked"],
      predicate: (span) => (span as ReadableSpan).name === "allow-me",
    });

    const span = createSpan("blocked", "voltagent");
    span.name = "allow-me";

    processor.onStart(span, noopContext);
    processor.onEnd(span);

    expect(delegate.onStart).toHaveBeenCalledTimes(1);
    expect(delegate.onEnd).toHaveBeenCalledTimes(1);
  });

  it("forwards lifecycle calls to the delegate", async () => {
    const delegate = createDelegate();
    const processor = new SpanFilterProcessor(delegate as unknown as SpanProcessor);

    await processor.shutdown();
    await processor.forceFlush();

    expect(delegate.shutdown).toHaveBeenCalledTimes(1);
    expect(delegate.forceFlush).toHaveBeenCalledTimes(1);
  });
});
