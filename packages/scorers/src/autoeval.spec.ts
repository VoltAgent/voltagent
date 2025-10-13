import { describe, expect, it, vi } from "vitest";

import { createAutoEvalScorer } from "./autoeval";
import { runLocalScorers, scorers } from "./index";

describe("createAutoEvalScorer", () => {
  it("wraps an AutoEval scorer and maps successful results", async () => {
    const scorerFn = vi.fn(async (args: { output: string }) => ({
      name: "example",
      score: 0.75,
      metadata: { received: args.output },
    }));

    const definition = createAutoEvalScorer<{ output: string }>({
      id: "auto-test",
      scorer: scorerFn,
    });

    const result = await definition.scorer({
      payload: { output: "VoltAgent" },
      params: {},
    });

    expect(scorerFn).toHaveBeenCalledWith({ output: "VoltAgent" });
    expect(result).toMatchObject({ status: "success", score: 0.75 });
    expect(result.metadata).toMatchObject({
      received: "VoltAgent",
      voltAgent: { scorer: "auto-test" },
    });
    const builderMetadata = (result.metadata as Record<string, unknown>).scorerBuilder as
      | Record<string, unknown>
      | undefined;
    expect(builderMetadata?.raw).toBeDefined();
    const autoEvalSnapshot = (builderMetadata?.raw as Record<string, unknown> | undefined)
      ?.autoEval as Record<string, unknown> | undefined;
    expect(autoEvalSnapshot?.score).toBe(0.75);
    expect((autoEvalSnapshot?.result as Record<string, unknown>)?.status).toBe("success");
    expect(definition.metadata).toMatchObject({ voltAgent: { scorer: "auto-test" } });
  });

  it("preserves objects and arrays, propagates errors", async () => {
    const error = new Error("LLM failure");
    const scorerFn = vi.fn(async (args: { output: unknown }) => {
      return {
        name: "example",
        score: null,
        error,
        metadata: { output: args.output },
      };
    });

    const definition = createAutoEvalScorer<{ output: unknown }>({
      id: "auto-error",
      scorer: scorerFn,
    });

    const result = await definition.scorer({
      payload: { output: { foo: "bar" } },
      params: {},
    });

    // Objects should be preserved, not stringified
    expect(scorerFn).toHaveBeenCalledWith({ output: { foo: "bar" } });
    expect(result.status).toBe("error");
    expect(result.error).toBe(error);
    expect(result.metadata).toMatchObject({
      output: { foo: "bar" },
      voltAgent: { scorer: "auto-error" },
    });
    const builderMetadata = (result.metadata as Record<string, unknown>).scorerBuilder as
      | Record<string, unknown>
      | undefined;
    const autoEvalSnapshot = (builderMetadata?.raw as Record<string, unknown> | undefined)
      ?.autoEval as Record<string, unknown> | undefined;
    expect((autoEvalSnapshot?.result as Record<string, unknown>)?.status).toBe("error");
  });
});

describe("default scorers map", () => {
  it("exposes levenshtein as a local scorer definition", async () => {
    const payload = {
      input: "VoltAgent",
      expected: "VoltAgent",
      output: "VoltAgent",
    } satisfies Record<string, unknown>;

    const execution = await runLocalScorers({
      payload,
      baseArgs: (context) => ({
        input: context.input,
        expected: context.expected,
        output: context.output,
      }),
      scorers: [scorers.levenshtein],
    });

    expect(execution.results[0]).toMatchObject({ score: 1, status: "success" });
  });

  it("provides metadata for exactMatch scorer", () => {
    expect(scorers.exactMatch.id).toBe("exactMatch");
    expect(scorers.exactMatch.metadata).toEqual({
      voltAgent: {
        scorer: "exactMatch",
      },
    });
  });

  it("executes listContains scorer with all items present", async () => {
    const payload = {
      output: ["apple", "banana"],
      expected: ["apple", "banana"],
    } satisfies Record<string, unknown>;

    const execution = await runLocalScorers({
      payload,
      baseArgs: (context) => ({
        output: context.output,
        expected: context.expected,
      }),
      scorers: [scorers.listContains],
    });

    expect(execution.results[0]).toMatchObject({ score: 1, status: "success" });
    expect(execution.results[0].metadata).toMatchObject({
      voltAgent: { scorer: "listContains" },
    });
  });

  it("executes listContains scorer with partial match", async () => {
    const payload = {
      output: ["apple", "banana"],
      expected: ["apple", "banana", "cherry"],
    } satisfies Record<string, unknown>;

    const execution = await runLocalScorers({
      payload,
      baseArgs: (context) => ({
        output: context.output,
        expected: context.expected,
      }),
      scorers: [scorers.listContains],
    });

    // Should be partial score since cherry is missing
    expect(execution.results[0].status).toBe("success");
    expect(execution.results[0].score).toBeGreaterThan(0);
    expect(execution.results[0].score).toBeLessThan(1);
  });

  it("executes numericDiff scorer with identical values", async () => {
    const payload = {
      output: 42,
      expected: 42,
    } satisfies Record<string, unknown>;

    const execution = await runLocalScorers({
      payload,
      baseArgs: (context) => ({
        output: context.output,
        expected: context.expected,
      }),
      scorers: [scorers.numericDiff],
    });

    expect(execution.results[0]).toMatchObject({ score: 1, status: "success" });
    expect(execution.results[0].metadata).toMatchObject({
      voltAgent: { scorer: "numericDiff" },
    });
  });

  it("executes numericDiff scorer with different values", async () => {
    const payload = {
      output: 40,
      expected: 42,
    } satisfies Record<string, unknown>;

    const execution = await runLocalScorers({
      payload,
      baseArgs: (context) => ({
        output: context.output,
        expected: context.expected,
      }),
      scorers: [scorers.numericDiff],
    });

    expect(execution.results[0].status).toBe("success");
    expect(execution.results[0].score).toBeGreaterThan(0);
    expect(execution.results[0].score).toBeLessThan(1);
  });

  it("executes jsonDiff scorer with identical objects", async () => {
    const payload = {
      output: { name: "VoltAgent", version: "1.0" },
      expected: { name: "VoltAgent", version: "1.0" },
    } satisfies Record<string, unknown>;

    const execution = await runLocalScorers({
      payload,
      baseArgs: (context) => ({
        output: context.output,
        expected: context.expected,
      }),
      scorers: [scorers.jsonDiff],
    });

    expect(execution.results[0]).toMatchObject({ score: 1, status: "success" });
    expect(execution.results[0].metadata).toMatchObject({
      voltAgent: { scorer: "jsonDiff" },
    });
  });

  it("executes jsonDiff scorer with nested object differences", async () => {
    const payload = {
      output: { name: "VoltAgent", config: { port: 3000 } },
      expected: { name: "VoltAgent", config: { port: 8080 } },
    } satisfies Record<string, unknown>;

    const execution = await runLocalScorers({
      payload,
      baseArgs: (context) => ({
        output: context.output,
        expected: context.expected,
      }),
      scorers: [scorers.jsonDiff],
    });

    expect(execution.results[0].status).toBe("success");
    expect(execution.results[0].score).toBeGreaterThan(0);
    expect(execution.results[0].score).toBeLessThan(1);
  });
});
