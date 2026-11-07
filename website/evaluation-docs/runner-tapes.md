---
title: Runner Tapes
---

# Runner Tapes

A runner tape records what your experiment runner returned before scoring, then replays it through the native `runExperiment` pipeline. Use it to iterate on scorers and thresholds without calling the target again.

A tape is recorded evidence, not a re-execution. Replay never calls the original runner and never falls back to it.

## Record, then replay

```typescript
import {
  createDirectoryTapeStore,
  createExperiment,
  createRecordingRunner,
  createReplayRunner,
  runExperiment,
} from "@voltagent/evals";

const manifest = {
  version: 1 as const,
  tapeId: "support-2026-11-06",
  runnerRevision: "support-agent@3", // you declare these; nothing is hashed for you
  datasetRevision: "support-qa@12",
};
const store = await createDirectoryTapeStore("./.tapes/support-2026-11-06", manifest);

const dataset = { items: [{ id: "q1", input: "How do I reset my password?" }] };

// 1. Record. The recording runner is a normal ExperimentRunner.
const recording = createRecordingRunner({
  store,
  manifest,
  runner: async ({ item }) => ({ output: await askAgent(item.input) }),
});
await runExperiment(createExperiment({ id: "record", dataset, runner: recording.runner }));
await recording.whenIdle();

// 2. Replay with different scorers. The target is not called.
await runExperiment(
  createExperiment({
    id: "replay",
    dataset,
    runner: createReplayRunner({ store, manifest }),
    scorers: [myNewScorer],
  }),
);
```

## What identifies a recording

Each result is keyed by the exact `item.id` and the original `index` the runner received, so the dataset order must be stable between record and replay. Replay also compares a fingerprint of the full item (input, expected, metadata, extra fields), the runtime `total`, and `runtime.tags`. Any difference throws `INPUT_MISMATCH`. Run IDs, start times, and the VoltOps client are not part of the identity.

Items and outputs must be bounded, plain, finite JSON-like data. Getters, class instances, functions, cycles, `NaN` and `Infinity` are rejected before the target is called.

## Interruptions and failures

Each slot is claimed durably before the target runs and is never claimed twice in the same tape.

- A claim with no terminal result is reported as `UNRESOLVED_RECORD` on replay. It can mean the run is still active, the process stopped, or the result could not be saved. Create a new tape to retry; nothing is retried automatically.
- If the target succeeds but capture or commit fails, the recorder throws a `TapeRunnerError` with `code: "CAPTURE_FAILED"` and `targetInvoked: true`.
- Abort before the claim does not claim or invoke. Abort after the claim but before invocation records a cancelled terminal. Once the target is running, the recorder waits for it to settle and stores the outcome.
- Target errors are recorded as a `TARGET_FAILED` classification only. Messages and stacks are not stored, and replay throws `RECORDED_TARGET_ERROR`.

If the target throws and the failure record cannot be saved, `CAPTURE_FAILED` is thrown with the original error attached as `cause`. The cause lives in memory only and is never written to the tape.

An abort that arrives while the target is running does not cancel it: the recorder waits for the target to settle and stores the outcome. This differs from the cooperative abort of a plain runner, so a runner that ignores its signal can delay the end of an aborted experiment.

The native pipeline may reject while other items are still running. Call `recording.whenIdle()` before inspecting or reusing the tape.

## Stores

- `createMemoryTapeStore(manifest)` is process-local and not durable.
- `createDirectoryTapeStore(root, manifest)` persists to an explicit directory. It is created `0700` with `0600` files and bound to the manifest on open. File names are hashes, never dataset IDs. Claims are fsynced (file and directory) before the target runs, and results are published by no-clobber hard link. Partial or corrupt files are never repaired or overwritten; a bad claim stays reserved and surfaces `STORE_CORRUPT`. If the file system cannot provide the required durability, opening or claiming fails before the target is invoked. Use a local file system, not a network share.

### Recovery and platform notes

- A slot that is reserved but unresolved, whether from a crash or from a claim fsync failure, cannot be reused. Use a new tape directory. Nothing is retried automatically, by design.
- `.tmp-*` files left by a crash are ignored by open and list. They are safe to delete when no writer is active.
- On Windows, directories cannot be fsynced, so opening or claiming fails with `DURABILITY_UNSUPPORTED`. Use the memory store or a POSIX file system.
- `maxEntries` limits claim admission only and is advisory across concurrent claimers; reading and listing are never capped.

Tape files contain your runner outputs and may be sensitive. They are integrity-checked against accidental damage, not authenticated against a malicious writer, and are not encrypted.

## Inspecting a tape

```typescript
import { inspectTape } from "@voltagent/evals";

const report = await inspectTape(store, { recorder: recording });
// { claims, completed, failed, cancelled, unresolved, indices, missingIndices,
//   conflictingIndices, provisional }
```

`inspectTape` returns counts and original indices only, never item IDs, inputs, or outputs. `claims` counts what was recorded, not the expected dataset size. `provisional` is `true` while any claim is unresolved or a recorder passed in `recorder` is active.
