import type { TapeEntry, TapeStore } from "./store.js";

export interface TapeInspection {
  /** Claims found; this is evidence recorded so far, not the size of the expected dataset. */
  claims: number;
  completed: number;
  failed: number;
  cancelled: number;
  /** Claimed with no terminal: active, interrupted, or failed to commit. Never "crashed". */
  unresolved: number;
  /** Sorted original runner indices per outcome. No item IDs, inputs or outputs. */
  indices: {
    completed: number[];
    failed: number[];
    cancelled: number[];
    unresolved: number[];
  };
  /** Indices below the highest claimed index with no claim at all. */
  missingIndices: number[];
  /** Indices claimed under more than one item ID, which replay can never align. */
  conflictingIndices: number[];
  /** True while results may still change: unresolved claims or recorder calls in flight. */
  provisional: boolean;
}

export interface InspectTapeOptions {
  /** Recorder feeding this store in this process, used to mark live activity provisional. */
  recorder?: { readonly activeCount: number };
}

function bucket(entry: TapeEntry): keyof TapeInspection["indices"] {
  switch (entry.terminal?.kind) {
    case "success":
      return "completed";
    case "error":
      return "failed";
    case "cancelled":
      return "cancelled";
    default:
      return "unresolved";
  }
}

/** Summarize a tape without exposing item identifiers, inputs, outputs, or errors. */
export async function inspectTape(
  store: TapeStore,
  options: InspectTapeOptions = {},
): Promise<TapeInspection> {
  const activeBefore = options.recorder?.activeCount ?? 0;
  const entries = await store.list();
  const indices: TapeInspection["indices"] = {
    completed: [],
    failed: [],
    cancelled: [],
    unresolved: [],
  };
  const items = new Map<number, Set<string>>();
  for (const entry of entries) {
    indices[bucket(entry)].push(entry.claim.index);
    const ids = items.get(entry.claim.index) ?? new Set<string>();
    ids.add(entry.claim.itemId);
    items.set(entry.claim.index, ids);
  }
  for (const list of Object.values(indices)) {
    list.sort((a, b) => a - b);
  }
  const claimed = [...items.keys()].sort((a, b) => a - b);
  const highest = claimed.length > 0 ? claimed[claimed.length - 1] : -1;
  const missingIndices: number[] = [];
  for (let index = 0; index < highest; index++) {
    if (!items.has(index)) {
      missingIndices.push(index);
    }
  }
  return {
    claims: entries.length,
    completed: indices.completed.length,
    failed: indices.failed.length,
    cancelled: indices.cancelled.length,
    unresolved: indices.unresolved.length,
    indices,
    missingIndices,
    conflictingIndices: claimed.filter((index) => (items.get(index)?.size ?? 0) > 1),
    provisional:
      indices.unresolved.length > 0 || activeBefore > 0 || (options.recorder?.activeCount ?? 0) > 0,
  };
}
