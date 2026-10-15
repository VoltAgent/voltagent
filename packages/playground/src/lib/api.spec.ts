import { describe, expect, it } from "vitest";
import { callOptions, initialSettings } from "../components/settings";
import { type StreamEvent, consumeSSE, parseObject, readableError } from "./api";
import { structureGraph } from "./graph";

describe("playground API contracts", () => {
  it("decodes chat error response bodies without hiding plain messages", () => {
    expect(readableError('{"error":"Provider unavailable","message":"Provider unavailable"}')).toBe(
      "Provider unavailable",
    );
    expect(readableError("Network error")).toBe("Network error");
    expect(readableError('{"unexpected":true}')).toBe('{"unexpected":true}');
  });
  it("summarizes wrapped schema failures without losing the field path", () => {
    expect(
      readableError(
        'Invalid input for tool weather: Error message: [{"path":["city"],"message":"Expected string"}]',
      ),
    ).toBe("city: Expected string");
    expect(readableError('[{"path":["ok"],"message":"Expected boolean"}]')).toBe(
      "ok: Expected boolean",
    );
  });
  it("parses fragmented UTF-8 SSE frames, CRLF, comments and multiline data", async () => {
    const bytes = new TextEncoder().encode(
      ': keepalive\r\ndata: {"type":"step",\r\ndata: "data":"İstanbul"}\r\n\r\ndata: {"type":"workflow-result","status":"completed"}\n\ndata: [DONE]\n\n',
    );
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    });
    const events: StreamEvent[] = [];
    await consumeSSE(
      new Response(stream, { headers: { "Content-Type": "text/event-stream" } }),
      (event) => events.push(event),
    );
    expect(events).toEqual([
      { type: "step", data: "İstanbul" },
      { type: "workflow-result", status: "completed" },
    ]);
  });

  it("validates settings and sends context under the VoltAgent namespace", () => {
    expect(
      callOptions({
        ...initialSettings(),
        context: '{"language":"tr"}',
        temperature: "0",
        maxSteps: "5",
      }),
    ).toMatchObject({ temperature: 0, maxSteps: 5, voltagent: { context: { language: "tr" } } });
    expect(() => callOptions({ ...initialSettings(), maxSteps: "1.5" })).toThrow(
      "positive integer",
    );
    expect(() => parseObject("[]", "Context")).toThrow("JSON object");
  });

  it("renders the serialized workflow contract, including parallel and nested steps", () => {
    const graph = structureGraph(
      {
        id: "workflow",
        name: "Workflow",
        steps: [
          {
            id: "parallel",
            type: "parallel-all",
            subSteps: [
              { id: "a", type: "func" },
              { id: "b", type: "func" },
            ],
          },
          { id: "loop", type: "loop", nestedStep: { id: "child", type: "func" } },
        ],
      },
      "workflow",
    );
    expect(graph.nodes).toHaveLength(6);
    const parallel = graph.edges.filter((edge) => edge.source === "workflow/step/parallel");
    expect(parallel.map((edge) => edge.target)).toEqual(
      expect.arrayContaining(["workflow/step/parallel/step/a", "workflow/step/parallel/step/b"]),
    );
    expect(graph.edges).toContainEqual(
      expect.objectContaining({
        source: "workflow/step/loop",
        target: "workflow/step/loop/step/child",
      }),
    );
  });

  it("shows configured memory/retrieval/guardrail components and marks only matching agent tools", () => {
    const graph = structureGraph(
      {
        id: "parent",
        name: "Parent",
        tools: [{ name: "shared" }],
        memory: {
          available: true,
          embeddingModel: { enabled: true },
          vectorDB: { enabled: true },
          workingMemory: { enabled: true },
        },
        retriever: { name: "search" },
        guardrails: { input: [{ name: "validate" }] },
        subAgents: [{ id: "child", name: "Child", tools: [{ name: "shared" }] }],
      },
      "agent",
      {
        traceId: "trace",
        spanCount: 1,
        spans: [
          {
            spanId: "span",
            traceId: "trace",
            name: "tool",
            startTime: "2026-01-01T00:00:00Z",
            endTime: "2026-01-01T00:00:01Z",
            status: { code: 1 },
            attributes: { "entity.id": "child", "span.type": "tool", "tool.name": "shared" },
          },
        ],
      },
    );
    expect(graph.nodes.map((node) => node.data.kind)).toEqual(
      expect.arrayContaining(["embedding", "vector", "working-memory", "retriever", "guardrail"]),
    );
    expect(
      graph.nodes.find((node) => node.id === "parent/tool/shared")?.data.status,
    ).toBeUndefined();
    expect(
      graph.nodes.find((node) => node.id === "parent/agent/child/tool/shared")?.data.status,
    ).toBe("success");
  });
});
