import { describe, expect, it } from "vitest";
import { captureTapeValue, restoreTapeValue } from "./codec.js";
import { captureRunnerIdentity } from "./identity.js";
import { createMemoryTapeStore } from "./memory-store.js";

const manifest = {
  version: 1 as const,
  tapeId: "test",
  runnerRevision: "runner",
  datasetRevision: "dataset",
};
const capturedIdentity = captureRunnerIdentity({ item: { id: "item", input: "hello" }, index: 0 });

const identity = {
  key: capturedIdentity.key,
  digest: capturedIdentity.digest,
  itemId: capturedIdentity.item.id,
  index: capturedIdentity.index,
};

describe("memory tape store", () => {
  it("claims each slot at most once under concurrent callers", async () => {
    const store = createMemoryTapeStore(manifest);
    const attempts = await Promise.allSettled(
      Array.from({ length: 12 }, () => store.claim(identity)),
    );
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(11);
    const entry = await store.read(identity.key);
    expect(entry?.terminal).toBeUndefined();
    expect((await store.list()).length).toBe(1);
  });

  it("commits only the owner's terminal result and refuses overwrites", async () => {
    const store = createMemoryTapeStore(manifest);
    const claim = await store.claim(identity);
    const result = {
      kind: "success" as const,
      invoked: true as const,
      value: captureTapeValue({ output: "answer", metadata: null }),
    };
    await expect(store.complete({ ...claim, token: "wrong" }, result)).rejects.toThrow();
    await store.complete(claim, result);
    await expect(store.complete(claim, result)).rejects.toThrow();
    await expect(store.claim(identity)).rejects.toThrow();
    const terminal = (await store.read(identity.key))?.terminal;
    expect(terminal?.kind).toBe("success");
    if (terminal?.kind === "success") {
      expect(restoreTapeValue(terminal.value)).toEqual({ output: "answer", metadata: null });
    }
  });

  it("isolates caller mutations on reads and writes", async () => {
    const mutableManifest = { ...manifest };
    const store = createMemoryTapeStore(mutableManifest);
    mutableManifest.runnerRevision = "changed";
    expect(store.manifest.runnerRevision).toBe("runner");
    const claim = await store.claim(identity);
    const savedToken = claim.token;
    claim.token = "changed";
    expect((await store.read(identity.key))?.claim.token).toBe(savedToken);
    const entry = await store.read(identity.key);
    if (!entry) throw new Error("Missing claim");
    entry.claim.token = "also changed";
    expect((await store.list())[0].claim.token).toBe(savedToken);
  });
});
