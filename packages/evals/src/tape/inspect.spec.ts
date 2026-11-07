import { safeStringify } from "@voltagent/internal";
import { describe, expect, it } from "vitest";
import { captureTapeValue } from "./codec.js";
import { captureRunnerIdentity } from "./identity.js";
import { inspectTape } from "./inspect.js";
import { createMemoryTapeStore } from "./memory-store.js";

const manifest = {
  version: 1 as const,
  tapeId: "inspect",
  runnerRevision: "r",
  datasetRevision: "d",
};

function slot(id: string, index: number) {
  const captured = captureRunnerIdentity({ item: { id, input: "secret-input" }, index });
  return { key: captured.key, digest: captured.digest, itemId: id, index };
}

describe("inspectTape", () => {
  it("counts outcomes by original index without exposing content", async () => {
    const store = createMemoryTapeStore(manifest);
    await store.complete(await store.claim(slot("a", 0)), {
      kind: "success",
      invoked: true,
      value: captureTapeValue({ output: "secret-output" }),
    });
    await store.complete(await store.claim(slot("b", 1)), {
      kind: "error",
      invoked: true,
      code: "TARGET_FAILED",
    });
    await store.complete(await store.claim(slot("c", 2)), {
      kind: "cancelled",
      invoked: false,
      code: "ABORTED_BEFORE_INVOCATION",
    });
    await store.claim(slot("d", 5));
    const report = await inspectTape(store);
    expect(report).toMatchObject({
      claims: 4,
      completed: 1,
      failed: 1,
      cancelled: 1,
      unresolved: 1,
      missingIndices: [3, 4],
      conflictingIndices: [],
      provisional: true,
    });
    expect(report.indices.unresolved).toEqual([5]);
    expect(safeStringify(report)).not.toMatch(/secret|"a"|"b"/);
  });

  it("is final only when nothing is unresolved or active, and flags index conflicts", async () => {
    const store = createMemoryTapeStore(manifest);
    expect(await inspectTape(store)).toMatchObject({ claims: 0, provisional: false });
    const claim = await store.claim(slot("a", 0));
    await store.complete(claim, { kind: "error", invoked: true, code: "TARGET_FAILED" });
    expect((await inspectTape(store)).provisional).toBe(false);
    expect((await inspectTape(store, { recorder: { activeCount: 1 } })).provisional).toBe(true);
    await store.claim(slot("other", 0));
    expect((await inspectTape(store)).conflictingIndices).toEqual([0]);
  });
});
