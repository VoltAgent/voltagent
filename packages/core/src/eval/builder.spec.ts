import { describe, expect, it } from "vitest";

import type { AgentEvalContext } from "../agent/types";
import { buildScorer } from "./builder";

interface TestPayload extends Record<string, unknown> {
  input: string;
  output: string;
}

interface KeywordParams extends Record<string, unknown> {
  keyword: string;
}

describe("buildScorer", () => {
  it("builds a LocalScorerDefinition with the provided steps", async () => {
    const builder = buildScorer<TestPayload, KeywordParams>({
      id: "keyword-match",
      label: "Keyword Match",
      params: ({ output }) => ({
        keyword: output.split(" ")[0] ?? "",
      }),
    })
      .prepare(({ payload }) => payload.output.toLowerCase())
      .analyze(({ results, params }) => {
        const prepared = typeof results.prepare === "string" ? results.prepare : "";
        return prepared.includes(params.keyword.toLowerCase());
      })
      .score(({ results }) => (results.analyze ? 1 : 0))
      .reason(({ results }) => (results.analyze ? "Keyword detected" : "Keyword missing"));

    const definition = builder.build();

    expect(definition.id).toBe("keyword-match");
    expect(definition.name).toBe("Keyword Match");
    expect(typeof definition.scorer).toBe("function");

    const run = await builder.run({
      payload: { input: "foo", output: "VoltAgent rocks" },
      params: { keyword: "voltagent" },
    });

    expect(run.status).toBe("success");
    expect(run.score).toBe(1);
    expect(run.reason).toBe("Keyword detected");
    expect(run.metadata).toMatchObject({ reason: "Keyword detected" });
    expect(run.rawResult.status).toBe("success");
    expect(run.steps.prepare).toBe("voltagent rocks");
    expect(run.steps.analyze).toBe(true);
    expect(run.steps.score).toBe(1);
    expect(run.steps.reason).toBe("Keyword detected");
    expect(run.steps.raw).toBeTypeOf("object");
  });

  it("throws when score step is missing", () => {
    const builder = buildScorer<TestPayload, Record<string, unknown>>({
      id: "missing-score",
    }).prepare(({ payload }) => payload.output);

    expect(() => builder.build()).toThrow(/missing a required 'score'/);
  });

  it("uses builder level params when run overrides are absent", async () => {
    const builder = buildScorer<TestPayload, KeywordParams>({
      id: "default-params",
      params: { keyword: "VoltAgent" },
    }).score(({ params, payload }) =>
      payload.output.toLowerCase().includes(params.keyword.toLowerCase()) ? 1 : 0,
    );

    const run = await builder.run({
      payload: { input: "", output: "VoltAgent forever" },
    });

    expect(run.score).toBe(1);
    expect(run.params.keyword).toBe("VoltAgent");
  });

  it("returns skipped status when sampling policy chooses not to run", async () => {
    const builder = buildScorer<TestPayload, KeywordParams>({
      id: "skipped-sampling",
      sampling: { type: "never" },
      params: { keyword: "VoltAgent" },
    }).score(() => 1);

    const result = await builder.run({
      payload: { input: "", output: "" },
    });

    expect(result.status).toBe("skipped");
    expect(result.score).toBeNull();
    expect(result.steps.raw).toEqual({});
  });

  it("provides accumulated results in step contexts without judge defaults", async () => {
    const builder = buildScorer<TestPayload, { keyword: string }>({
      id: "context-snapshots",
      params: { keyword: "VoltAgent" },
    })
      .prepare(({ payload }) => payload.output.toUpperCase())
      .analyze(({ results }) => results.prepare === "OK")
      .score((context) => {
        expect(context.results.prepare).toBe("OK");
        expect(context.results.analyze).toBe(true);
        expect(context.params.keyword).toBe("VoltAgent");
        expect("judge" in context).toBe(false);
        return 1;
      });

    const result = await builder.run({ payload: { input: "", output: "ok" } });
    expect(result.status).toBe("success");
    expect(result.score).toBe(1);
  });

  it("supports agent type shortcuts", async () => {
    const builder = buildScorer({ id: "agent-shortcut", type: "agent" }).score(({ payload }) =>
      payload.output ? 1 : 0,
    );

    const payload: AgentEvalContext = {
      operationId: "op-1",
      operationType: "generateText",
      input: "Hi",
      output: "Hello",
      rawInput: "Hi",
      rawOutput: "Hello",
      userId: undefined,
      conversationId: undefined,
      traceId: "trace-1",
      spanId: "span-1",
      metadata: undefined,
      agentId: "agent-1",
      agentName: "Agent",
      timestamp: new Date().toISOString(),
      rawPayload: {
        operationId: "op-1",
        operationType: "generateText",
        traceId: "trace-1",
        spanId: "span-1",
      } as any,
    };

    const run = await builder.run({ payload });
    expect(run.score).toBe(1);
  });
});
