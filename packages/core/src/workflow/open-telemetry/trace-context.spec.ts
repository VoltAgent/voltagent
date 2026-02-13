import { SpanKind, context, trace } from "@opentelemetry/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NodeVoltAgentObservability } from "../../observability";
import { WorkflowTraceContext } from "./trace-context";

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

describe.sequential("WorkflowTraceContext", () => {
  let observability: NodeVoltAgentObservability;

  beforeEach(() => {
    observability = new NodeVoltAgentObservability();
  });

  afterEach(async () => {
    await observability.shutdown();
  });

  it("keeps workflow root spans root while linking active request spans", async () => {
    const tracer = observability.getTracer();
    const requestSpan = tracer.startSpan("http.request", { kind: SpanKind.SERVER });

    let traceContext: WorkflowTraceContext | undefined;
    context.with(trace.setSpan(context.active(), requestSpan), () => {
      traceContext = new WorkflowTraceContext(observability, "workflow.test", {
        workflowId: "wf-1",
        workflowName: "workflow-test",
        executionId: "exec-1",
      });
      traceContext.end("completed");
    });

    requestSpan.end();

    expect(traceContext).toBeDefined();
    if (!traceContext) {
      throw new Error("Workflow trace context was not created");
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

  it("preserves resume links while also linking active request spans", async () => {
    const tracer = observability.getTracer();
    const requestSpan = tracer.startSpan("http.request", { kind: SpanKind.SERVER });
    const previousSpan = tracer.startSpan("workflow.previous");
    const previousContext = previousSpan.spanContext();
    previousSpan.end();

    let traceContext: WorkflowTraceContext | undefined;
    let rootLinks:
      | Array<{
          context: {
            traceId: string;
            spanId: string;
          };
          attributes?: Record<string, unknown>;
        }>
      | undefined;
    context.with(trace.setSpan(context.active(), requestSpan), () => {
      traceContext = new WorkflowTraceContext(observability, "workflow.resume", {
        workflowId: "wf-2",
        workflowName: "workflow-resume",
        executionId: "exec-2",
        resumedFrom: {
          traceId: previousContext.traceId,
          spanId: previousContext.spanId,
        },
      });
      rootLinks = (traceContext.getRootSpan() as any).links;
      traceContext.end("completed");
    });

    requestSpan.end();
    expect(traceContext).toBeDefined();
    expect(rootLinks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          context: expect.objectContaining({
            traceId: requestSpan.spanContext().traceId,
            spanId: requestSpan.spanContext().spanId,
          }),
          attributes: expect.objectContaining({
            "link.type": "ambient-parent",
          }),
        }),
        expect.objectContaining({
          context: expect.objectContaining({
            traceId: previousContext.traceId,
            spanId: previousContext.spanId,
          }),
          attributes: expect.objectContaining({
            "link.type": "resume",
          }),
        }),
      ]),
    );
  });
});
