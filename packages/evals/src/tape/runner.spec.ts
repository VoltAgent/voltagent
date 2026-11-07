import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createExperiment } from "../experiment/create-experiment.js";
import { runExperiment } from "../experiment/run-experiment.js";
import { createDirectoryTapeStore } from "./directory-store.js";
import {
  type TapeRunnerError,
  type TapeStore,
  type TapeTerminal,
  createMemoryTapeStore,
  createRecordingRunner,
  createReplayRunner,
  inspectTape,
} from "./index.js";

const manifest = {
  version: 1 as const,
  tapeId: "runner",
  runnerRevision: "r1",
  datasetRevision: "d1",
};
const context = (id = "a", input: unknown = "hi", index = 0, extra = {}) => ({
  item: { id, input },
  index,
  ...extra,
});

async function runnerCode(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return `${(error as TapeRunnerError).code}:${(error as TapeRunnerError).targetInvoked}`;
  }
  return "resolved";
}

/** Wrap a store so selected operations fail, to inject I/O faults. */
function faulty(store: TapeStore, fail: { claim?: boolean; complete?: boolean }): TapeStore {
  return {
    manifest: store.manifest,
    claim: (identity) =>
      fail.claim ? Promise.reject(new Error("disk /secret/path")) : store.claim(identity),
    complete: (claim, terminal: TapeTerminal) =>
      fail.complete
        ? Promise.reject(new Error("disk /secret/path"))
        : store.complete(claim, terminal),
    read: (key) => store.read(key),
    list: () => store.list(),
  };
}

const cleanup: string[] = [];
afterEach(async () => {
  await Promise.all(cleanup.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("recording runner", () => {
  it("records, replays detached copies, and never exposes later mutation", async () => {
    const store = createMemoryTapeStore(manifest);
    const shared = { nested: { value: 1 } };
    const { runner } = createRecordingRunner({
      store,
      manifest,
      runner: () => ({ output: shared, metadata: { m: 1 }, traceIds: ["t"] }),
    });
    const live = (await runner(context())) as { output: typeof shared };
    shared.nested.value = 99;
    live.output.nested.value = 77;
    const replay = createReplayRunner({ store, manifest });
    expect(await replay(context())).toEqual({
      output: { nested: { value: 1 } },
      metadata: { m: 1 },
      traceIds: ["t"],
    });
  });

  it("hands the target a detached item so mutation during claim I/O cannot change identity", async () => {
    const store = createMemoryTapeStore(manifest);
    const seen: unknown[] = [];
    const { runner } = createRecordingRunner({
      store,
      manifest,
      runner: ({ item }) => {
        seen.push(item.input);
        return "done";
      },
    });
    const item = { id: "a", input: { q: "original" } };
    const pending = runner({ item, index: 0 });
    item.input.q = "mutated";
    await pending;
    expect(seen).toEqual([{ q: "original" }]);
    const replay = createReplayRunner({ store, manifest });
    expect(await replay({ item: { id: "a", input: { q: "original" } }, index: 0 })).toMatchObject({
      output: "done",
    });
    expect(await runnerCode(replay({ item, index: 0 }))).toBe("INPUT_MISMATCH:false");
  });

  it("refuses duplicate attempts and never reinvokes a claimed slot", async () => {
    const store = createMemoryTapeStore(manifest);
    let calls = 0;
    const { runner, whenIdle } = createRecordingRunner({
      store,
      manifest,
      runner: async () => {
        calls++;
        return "x";
      },
    });
    const results = await Promise.allSettled([runner(context()), runner(context())]);
    await whenIdle();
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(calls).toBe(1);
    await expect(runner(context())).rejects.toThrow(/reserved/);
    expect(calls).toBe(1);
  });

  it("rejects unsupported input and mismatched manifests before any claim or call", async () => {
    const store = createMemoryTapeStore(manifest);
    let calls = 0;
    const { runner } = createRecordingRunner({
      store,
      manifest,
      runner: () => {
        calls++;
        return "x";
      },
    });
    await expect(runner(context("a", () => 1))).rejects.toThrow();
    await expect(runner(context("a", { n: Number.NaN }))).rejects.toThrow();
    expect(calls).toBe(0);
    expect(await store.list()).toEqual([]);
    expect(() =>
      createRecordingRunner({
        store,
        manifest: { ...manifest, datasetRevision: "d2" },
        runner: () => 1,
      }),
    ).toThrow(/manifest/i);
    expect(() => createReplayRunner({ store, manifest: { ...manifest, tapeId: "z" } })).toThrow(
      /manifest/i,
    );
  });

  it("records target failures without raw messages and rethrows the live error", async () => {
    const store = createMemoryTapeStore(manifest);
    const failure = new Error("api key sk-secret rejected");
    const { runner } = createRecordingRunner({
      store,
      manifest,
      runner: () => {
        throw failure;
      },
    });
    await expect(runner(context())).rejects.toBe(failure);
    const entry = (await store.list())[0];
    expect(entry.terminal).toEqual({ kind: "error", invoked: true, code: "TARGET_FAILED" });
    const replayFailure = await createReplayRunner({ store, manifest })(context()).catch(
      (error: TapeRunnerError) => error,
    );
    expect((replayFailure as TapeRunnerError).code).toBe("RECORDED_TARGET_ERROR");
    expect(String((replayFailure as Error).message)).not.toContain("secret");
  });

  it("records falsy thrown values as failures", async () => {
    const store = createMemoryTapeStore(manifest);
    const { runner } = createRecordingRunner({
      store,
      manifest,
      runner: () => {
        throw 0;
      },
    });
    await expect(runner(context())).rejects.toBe(0);
    expect((await store.list())[0].terminal?.kind).toBe("error");
  });

  it("rejects non-plain target output as a capture failure after invocation", async () => {
    const store = createMemoryTapeStore(manifest);
    const { runner } = createRecordingRunner({
      store,
      manifest,
      runner: () => ({
        output: {
          get leak() {
            return "x";
          },
        },
      }),
    });
    expect(await runnerCode(runner(context()))).toBe("CAPTURE_FAILED:true");
    const [entry] = await store.list();
    expect(entry.terminal).toBeUndefined();
    expect(await runnerCode(createReplayRunner({ store, manifest })(context()))).toBe(
      "UNRESOLVED_RECORD:false",
    );
  });
});

describe("cancellation boundaries", () => {
  it("does not claim or invoke when aborted before the claim", async () => {
    const store = createMemoryTapeStore(manifest);
    let calls = 0;
    const { runner } = createRecordingRunner({
      store,
      manifest,
      runner: () => {
        calls++;
        return 1;
      },
    });
    const controller = new AbortController();
    controller.abort();
    expect(await runnerCode(runner(context("a", "hi", 0, { signal: controller.signal })))).toBe(
      "ABORTED:false",
    );
    expect(calls).toBe(0);
    expect(await store.list()).toEqual([]);
  });

  it("records a cancelled terminal when aborted between claim and invocation", async () => {
    const base = createMemoryTapeStore(manifest);
    const controller = new AbortController();
    const store: TapeStore = {
      ...faulty(base, {}),
      claim: async (identity) => {
        const claim = await base.claim(identity);
        controller.abort();
        return claim;
      },
    };
    let calls = 0;
    const { runner } = createRecordingRunner({
      store,
      manifest,
      runner: () => {
        calls++;
        return 1;
      },
    });
    expect(await runnerCode(runner(context("a", "hi", 0, { signal: controller.signal })))).toBe(
      "ABORTED:false",
    );
    expect(calls).toBe(0);
    expect((await base.list())[0].terminal).toEqual({
      kind: "cancelled",
      invoked: false,
      code: "ABORTED_BEFORE_INVOCATION",
    });
    expect(await runnerCode(createReplayRunner({ store: base, manifest })(context()))).toBe(
      "RECORDED_CANCELLATION:false",
    );
  });

  it("waits for an in-flight target to settle and persists its result despite abort", async () => {
    const store = createMemoryTapeStore(manifest);
    const controller = new AbortController();
    let release: () => void = () => {};
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { runner, whenIdle, activeCount } = (() => {
      const recording = createRecordingRunner({
        store,
        manifest,
        runner: async () => {
          await gate;
          return "late";
        },
      });
      return { ...recording, activeCount: () => recording.activeCount };
    })();
    let settled = false;
    const pending = runner(context("a", "hi", 0, { signal: controller.signal })).then((value) => {
      settled = true;
      return value;
    });
    await new Promise((resolve) => setTimeout(resolve, 5));
    controller.abort();
    await new Promise((resolve) => setTimeout(resolve, 5));
    expect(settled).toBe(false);
    expect(activeCount()).toBe(1);
    release();
    expect(await pending).toMatchObject({ output: "late" });
    await whenIdle();
    expect(activeCount()).toBe(0);
    expect((await store.list())[0].terminal?.kind).toBe("success");
  });
});

describe("commit and claim failure injection", () => {
  it("does not invoke the target when the claim cannot be made durable", async () => {
    let calls = 0;
    const { runner } = createRecordingRunner({
      store: faulty(createMemoryTapeStore(manifest), { claim: true }),
      manifest,
      runner: () => {
        calls++;
        return 1;
      },
    });
    await expect(runner(context())).rejects.toThrow("disk");
    expect(calls).toBe(0);
  });

  it("leaves an unresolved claim and a typed redacted error when the terminal commit fails", async () => {
    const base = createMemoryTapeStore(manifest);
    let calls = 0;
    const { runner } = createRecordingRunner({
      store: faulty(base, { complete: true }),
      manifest,
      runner: () => {
        calls++;
        return "value";
      },
    });
    const error = await runner(context()).catch((e: TapeRunnerError) => e);
    expect((error as TapeRunnerError).code).toBe("CAPTURE_FAILED");
    expect((error as TapeRunnerError).targetInvoked).toBe(true);
    expect((error as Error).message).not.toContain("secret");
    expect((await base.list())[0].terminal).toBeUndefined();
    await expect(runner(context())).rejects.toThrow();
    expect(calls).toBe(1);
  });

  it("reports commit failure after a target error as a capture error carrying the live cause", async () => {
    const original = new Error("boom");
    const { runner } = createRecordingRunner({
      store: faulty(createMemoryTapeStore(manifest), { complete: true }),
      manifest,
      runner: () => {
        throw original;
      },
    });
    const error = (await runner(context()).catch((e: unknown) => e)) as TapeRunnerError;
    expect(error.code).toBe("CAPTURE_FAILED");
    expect(error.targetInvoked).toBe(true);
    expect(error.cause).toBe(original);
    expect(error.message).not.toContain("boom");
  });
});

describe("replay", () => {
  it("rejects missing records, changed inputs, changed index, and unresolved claims", async () => {
    const store = createMemoryTapeStore(manifest);
    const { runner } = createRecordingRunner({ store, manifest, runner: () => "ok" });
    await runner(context("a", "hi", 0, { total: 2 }));
    const replay = createReplayRunner({ store, manifest });
    expect(await runnerCode(replay(context("zzz")))).toBe("MISSING_RECORD:false");
    expect(await runnerCode(replay(context("a", "hi", 1)))).toBe("MISSING_RECORD:false");
    expect(await runnerCode(replay(context("a", "changed", 0, { total: 2 })))).toBe(
      "INPUT_MISMATCH:false",
    );
    expect(await runnerCode(replay(context("a", "hi", 0, { total: 3 })))).toBe(
      "INPUT_MISMATCH:false",
    );
    expect(await replay(context("a", "hi", 0, { total: 2 }))).toMatchObject({ output: "ok" });
    const aborted = new AbortController();
    aborted.abort();
    expect(await runnerCode(replay(context("a", "hi", 0, { signal: aborted.signal })))).toBe(
      "ABORTED:false",
    );
  });

  it("survives a restart on the directory store and keeps interrupted claims unresolved", async () => {
    const root = await mkdtemp(join(tmpdir(), "tape-restart-"));
    cleanup.push(root);
    const first = await createDirectoryTapeStore(join(root, "t"), manifest);
    const recording = createRecordingRunner({ store: first, manifest, runner: () => "kept" });
    await recording.runner(context("a"));
    // Simulate a process dying after the claim and before the terminal commit.
    const { captureRunnerIdentity } = await import("./identity.js");
    const lost = captureRunnerIdentity(context("b", "hi", 1));
    await first.claim({ key: lost.key, digest: lost.digest, itemId: "b", index: 1 });

    const reopened = await createDirectoryTapeStore(join(root, "t"), manifest);
    const report = await inspectTape(reopened);
    expect(report).toMatchObject({ completed: 1, unresolved: 1, provisional: true });
    const replay = createReplayRunner({ store: reopened, manifest });
    expect(await replay(context("a"))).toMatchObject({ output: "kept" });
    expect(await runnerCode(replay(context("b", "hi", 1)))).toBe("UNRESOLVED_RECORD:false");
    let calls = 0;
    const retry = createRecordingRunner({
      store: reopened,
      manifest,
      runner: () => {
        calls++;
        return "again";
      },
    });
    await expect(retry.runner(context("b", "hi", 1))).rejects.toThrow(/reserved/);
    expect(calls).toBe(0);
  });

  it("surfaces replayed target failures through native runExperiment as errors", async () => {
    const store = createMemoryTapeStore(manifest);
    const { runner, whenIdle } = createRecordingRunner({
      store,
      manifest,
      runner: ({ item }) => {
        if (item.id === "bad") {
          throw undefined;
        }
        return "fine";
      },
    });
    const dataset = {
      items: [
        { id: "ok", input: "x" },
        { id: "bad", input: "y" },
      ],
    };
    await runExperiment(createExperiment({ id: "rec", dataset, runner }));
    await whenIdle();
    const replayed = await runExperiment(
      createExperiment({
        id: "rep",
        dataset,
        runner: createReplayRunner({ store, manifest }),
        scorers: [{ id: "s", name: "s", scorer: () => ({ status: "success", score: 1 }) }],
      }),
    );
    expect(replayed.items.map((item) => item.status)).toEqual(["passed", "error"]);
  });
});
