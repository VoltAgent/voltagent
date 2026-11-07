import { describe, expect, it } from "vitest";
import { captureRunnerIdentity, validateTapeManifest } from "./identity.js";

describe("runner tape identity", () => {
  it("binds complete item data, original index, total presence and runtime tags", () => {
    const context = { item: { id: "a", input: "hello", raw: { revision: 1 } }, index: 0 };
    const captured = captureRunnerIdentity(context);
    context.item.raw.revision = 2;
    expect(captured.item.raw).toEqual({ revision: 1 });
    expect(captureRunnerIdentity(context).digest).not.toBe(captured.digest);
    const plain = { item: { id: "a", input: "hello" }, index: 0 };
    const first = captureRunnerIdentity(plain);
    expect(captureRunnerIdentity({ ...plain, total: undefined }).digest).not.toBe(first.digest);
    expect(captureRunnerIdentity({ ...plain, index: 1 }).key).not.toBe(first.key);
    expect(captureRunnerIdentity({ ...plain, runtime: { tags: ["new"] } }).digest).not.toBe(
      first.digest,
    );
  });

  it("excludes run IDs, start times, clients and cancellation signals", () => {
    const context = { item: { id: "a", input: null }, index: 0 };
    expect(
      captureRunnerIdentity({ ...context, runtime: { runId: "one", startedAt: 1 } }).digest,
    ).toBe(
      captureRunnerIdentity({
        ...context,
        runtime: { runId: "two", startedAt: 2 },
        signal: new AbortController().signal,
        voltOpsClient: {},
      }).digest,
    );
  });

  it("requires explicit bounded revision declarations and rejects unsupported schema", () => {
    const manifest = {
      version: 1,
      tapeId: "tape",
      runnerRevision: "runner",
      datasetRevision: "dataset",
    };
    expect(validateTapeManifest(manifest)).toEqual(manifest);
    for (const bad of [
      { ...manifest, version: 2 },
      { ...manifest, tapeId: "" },
      { ...manifest, extra: true },
      { ...manifest, runnerRevision: "x".repeat(1025) },
    ]) {
      expect(() => validateTapeManifest(bad)).toThrow();
    }
  });

  it("rejects invalid native identity fields before a target can run", () => {
    for (const bad of [
      { item: { id: "", input: 1 }, index: 0 },
      { item: { id: "a", input: 1 }, index: -1 },
      { item: { id: "a", input: 1 }, index: 1.5 },
      { item: { id: "a", input: 1 }, index: 0, total: null },
      { item: { id: "a", input: 1 }, index: 0, runtime: { tags: [42] } },
    ]) {
      expect(() => captureRunnerIdentity(bad as never)).toThrow();
    }
  });
});
