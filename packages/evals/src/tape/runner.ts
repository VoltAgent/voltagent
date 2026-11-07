import { normalizeRunnerResult } from "../experiment/runner-result.js";
import type {
  ExperimentDatasetItem,
  ExperimentRunner,
  ExperimentRunnerContext,
  ExperimentRunnerReturn,
} from "../experiment/types.js";
import { captureTapeValue, restoreTapeValue } from "./codec.js";
import { type TapeManifest, captureRunnerIdentity, tapeManifestDigest } from "./identity.js";
import type { TapeClaim, TapeStore, TapeTerminal } from "./store.js";

export type TapeRunnerErrorCode =
  | "MANIFEST_MISMATCH"
  | "INPUT_MISMATCH"
  | "MISSING_RECORD"
  | "UNRESOLVED_RECORD"
  | "RECORDED_TARGET_ERROR"
  | "RECORDED_CANCELLATION"
  | "ABORTED"
  | "CAPTURE_FAILED";

const MESSAGES: Record<TapeRunnerErrorCode, string> = {
  MANIFEST_MISMATCH: "Tape manifest does not match the requested runner and dataset revisions",
  INPUT_MISMATCH: "Recorded tape input does not match this runner context",
  MISSING_RECORD: "No recorded tape entry exists for this item and index",
  UNRESOLVED_RECORD: "Recorded tape claim has no terminal result; its outcome is unresolved",
  RECORDED_TARGET_ERROR: "Recorded target invocation failed; original error details are not stored",
  RECORDED_CANCELLATION: "Recorded invocation was cancelled before the target ran",
  ABORTED: "Tape runner was aborted before target invocation",
  CAPTURE_FAILED:
    "Tape capture or terminal commit failed; inspect the store before creating a new attempt",
};

export class TapeRunnerError extends Error {
  constructor(
    readonly code: TapeRunnerErrorCode,
    /** Whether the target was invoked in this call, not in the recorded source. */
    readonly targetInvoked: boolean = false,
    cause?: { error: unknown },
  ) {
    super(MESSAGES[code], cause ? { cause: cause.error } : undefined);
    this.name = "TapeRunnerError";
  }
}

export interface TapeRunnerOptions {
  store: TapeStore;
  manifest: TapeManifest;
}

export interface RecordingRunner<Item extends ExperimentDatasetItem, Output, Client> {
  runner: ExperimentRunner<Item, Output, Client>;
  /** Wait for calls already active, including calls left active by an outer failure. */
  whenIdle(): Promise<void>;
  /** Calls in flight in this process; `inspectTape` uses it to mark results provisional. */
  readonly activeCount: number;
}

function checkManifest(store: TapeStore, expectedDigest: string): void {
  if (tapeManifestDigest(store.manifest) !== expectedDigest) {
    throw new TapeRunnerError("MANIFEST_MISMATCH");
  }
}

async function commitTerminal(
  store: TapeStore,
  claim: TapeClaim,
  terminal: TapeTerminal,
  targetInvoked: boolean,
  targetError?: { error: unknown },
): Promise<void> {
  try {
    await store.complete(claim, terminal);
  } catch {
    // The terminal may have been published before a durability barrier failed.
    // Do not claim absence, automatically retry, or reclassify as target failure.
    // The live target error is kept on `cause` in memory only; it is never persisted.
    throw new TapeRunnerError("CAPTURE_FAILED", targetInvoked, targetError);
  }
}

export function createRecordingRunner<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
  Client = unknown,
>(
  options: TapeRunnerOptions & { runner: ExperimentRunner<Item, Output, Client> },
): RecordingRunner<Item, Output, Client> {
  const { store, runner } = options;
  const manifestDigest = tapeManifestDigest(options.manifest);
  checkManifest(store, manifestDigest);
  const active = new Set<Promise<void>>();

  async function record(
    context: ExperimentRunnerContext<Item, Client>,
  ): Promise<ExperimentRunnerReturn<Output>> {
    if (context.signal?.aborted) {
      throw new TapeRunnerError("ABORTED");
    }
    checkManifest(store, manifestDigest);
    const identity = captureRunnerIdentity(context);
    const claim = await store.claim({
      key: identity.key,
      digest: identity.digest,
      itemId: identity.item.id,
      index: identity.index,
    });
    if (context.signal?.aborted) {
      await commitTerminal(
        store,
        claim,
        { kind: "cancelled", invoked: false, code: "ABORTED_BEFORE_INVOCATION" },
        false,
      );
      throw new TapeRunnerError("ABORTED");
    }
    const detached: ExperimentRunnerContext<Item, Client> = {
      item: identity.item,
      index: identity.index,
      signal: context.signal,
      voltOpsClient: context.voltOpsClient,
    };
    if (identity.totalPresent) {
      detached.total = identity.total;
    }
    if (context.runtime !== undefined) {
      detached.runtime = { ...context.runtime };
      if (identity.tagsPresent) {
        detached.runtime.tags = identity.tags;
      }
    }
    let returned: ExperimentRunnerReturn<Output>;
    try {
      // Await actual settlement even if the signal aborts during execution.
      returned = await runner(detached);
    } catch (error) {
      await commitTerminal(
        store,
        claim,
        { kind: "error", invoked: true, code: "TARGET_FAILED" },
        true,
        { error },
      );
      throw error;
    }
    let terminal: TapeTerminal;
    try {
      // Reject getters and custom objects before the native normalizer reads fields.
      const detachedReturn = restoreTapeValue(captureTapeValue(returned));
      const normalized = normalizeRunnerResult(detachedReturn);
      terminal = { kind: "success", invoked: true, value: captureTapeValue(normalized) };
    } catch {
      throw new TapeRunnerError("CAPTURE_FAILED", true);
    }
    await commitTerminal(store, claim, terminal, true);
    return restoreTapeValue(terminal.value) as ExperimentRunnerReturn<Output>;
  }

  return {
    runner(context) {
      let resolveActivity: () => void = () => {};
      const activity = new Promise<void>((resolve) => {
        resolveActivity = resolve;
      });
      active.add(activity);
      return record(context).finally(() => {
        active.delete(activity);
        resolveActivity();
      });
    },
    get activeCount() {
      return active.size;
    },
    async whenIdle() {
      while (active.size > 0) {
        await Promise.all(active);
      }
    },
  };
}

/** Replay evidence through the native scoring pipeline, with no target fallback. */
export function createReplayRunner<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
  Output = unknown,
  Client = unknown,
>(options: TapeRunnerOptions): ExperimentRunner<Item, Output, Client> {
  const { store } = options;
  const manifestDigest = tapeManifestDigest(options.manifest);
  checkManifest(store, manifestDigest);
  return async (context) => {
    if (context.signal?.aborted) {
      throw new TapeRunnerError("ABORTED");
    }
    checkManifest(store, manifestDigest);
    const identity = captureRunnerIdentity(context);
    const entry = await store.read(identity.key);
    if (!entry) {
      throw new TapeRunnerError("MISSING_RECORD");
    }
    if (
      entry.claim.manifestDigest !== manifestDigest ||
      entry.claim.key !== identity.key ||
      entry.claim.digest !== identity.digest
    ) {
      throw new TapeRunnerError("INPUT_MISMATCH");
    }
    if (!entry.terminal) {
      throw new TapeRunnerError("UNRESOLVED_RECORD");
    }
    switch (entry.terminal.kind) {
      case "success":
        return restoreTapeValue(entry.terminal.value) as ExperimentRunnerReturn<Output>;
      case "error":
        throw new TapeRunnerError("RECORDED_TARGET_ERROR");
      case "cancelled":
        throw new TapeRunnerError("RECORDED_CANCELLATION");
    }
  };
}
