import { SpanKind, context, trace } from "@opentelemetry/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeVoltAgentObservability } from "../../observability";
import { AgentTraceContext } from "./trace-context";

async function waitForSpan(
  observability: NodeVoltAgentObservability,
  traceId: string,
  spanId: string,
) {
  for (let attempt = 0; attempt < 10; attempt++) {
    await observability.forceFlush();
    const traceSpans = await observability.getTraceFromStorage(traceId);
    const span = traceSpans.find((candidate: any) => candidate.spanId === spanId);
    if (span) {
      return span;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return undefined;
}

describe.sequential("AgentTraceContext", () => {
  let observability: NodeVoltAgentObservability;

  beforeEach(() => {
    observability = new NodeVoltAgentObservability();
  });

  afterEach(async () => {
    await observability.shutdown();
  });

  it("keeps agent root spans root while linking active request spans", async () => {
    const tracer = observability.getTracer();
    const requestSpan = tracer.startSpan("http.request", { kind: SpanKind.SERVER });

    let traceContext: AgentTraceContext | undefined;
    context.with(trace.setSpan(context.active(), requestSpan), () => {
      traceContext = new AgentTraceContext(observability, "agent.test", {
        agentId: "agent-1",
        agentName: "agent-test",
        operationId: "op-1",
        inheritParentSpan: true,
      });
      traceContext.end("completed");
    });

    requestSpan.end();

    expect(traceContext).toBeDefined();
    if (!traceContext) {
      throw new Error("Agent trace context was not created");
    }

    const rootSpanContext = traceContext.getRootSpan().spanContext();
    const storedRoot = await waitForSpan(
      observability,
      rootSpanContext.traceId,
      rootSpanContext.spanId,
    );

    expect(storedRoot).toBeDefined();
    expect(storedRoot.parentSpanId).toBeUndefined();
    expect(storedRoot.links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          traceId: requestSpan.spanContext().traceId,
          spanId: requestSpan.spanContext().spanId,
          attributes: expect.objectContaining({
            "link.type": "ambient-parent",
          }),
        }),
      ]),
    );
  });
});
