import {
  type TapeValue,
  TapeValueError,
  captureTapeValue,
  restoreTapeValue,
  tapeDigest,
} from "./codec.js";
import type { TapeManifest } from "./identity.js";

export interface TapeSlotIdentity {
  key: string;
  digest: string;
  itemId: string;
  index: number;
}

export interface TapeClaim extends TapeSlotIdentity {
  version: 1;
  manifestDigest: string;
  token: string;
  claimedAt: number;
}

export type TapeTerminal =
  | { kind: "success"; invoked: true; value: TapeValue }
  | { kind: "error"; invoked: true; code: "TARGET_FAILED" }
  | { kind: "cancelled"; invoked: false; code: "ABORTED_BEFORE_INVOCATION" };

export interface TapeEntry {
  claim: TapeClaim;
  /** Absent means unresolved: active, interrupted, or failed capture/commit. */
  terminal?: TapeTerminal;
}

/** A store is bound to one immutable manifest for its lifetime. */
export interface TapeStore {
  readonly manifest: Readonly<TapeManifest>;
  claim(identity: TapeSlotIdentity): Promise<TapeClaim>;
  complete(claim: TapeClaim, terminal: TapeTerminal): Promise<void>;
  read(key: string): Promise<TapeEntry | undefined>;
  list(): Promise<TapeEntry[]>;
}

export type TapeStoreErrorCode =
  | "SLOT_RESERVED"
  | "CLAIM_MISMATCH"
  | "ALREADY_COMPLETED"
  | "STORE_CAPACITY"
  | "STORE_CORRUPT"
  | "STORE_UNSAFE"
  | "STORE_MANIFEST_MISMATCH"
  | "STORE_IO"
  | "DURABILITY_UNSUPPORTED";
const MESSAGES: Record<TapeStoreErrorCode, string> = {
  SLOT_RESERVED: "Tape slot is already reserved; use a new tape for a new attempt",
  CLAIM_MISMATCH: "Tape claim does not own this slot",
  ALREADY_COMPLETED: "Tape terminal results cannot be overwritten",
  STORE_CAPACITY: "Tape store has reached its configured slot capacity",
  STORE_CORRUPT:
    "Tape store contains a malformed, partial, or inconsistent record; it was not repaired",
  STORE_UNSAFE: "Tape directory is not a private directory owned by this tape",
  STORE_MANIFEST_MISMATCH: "Tape directory belongs to a different manifest",
  STORE_IO: "Tape store I/O failed; inspect the store before creating a new attempt",
  DURABILITY_UNSUPPORTED:
    "The file system does not support the durability operations tapes require",
};

export class TapeStoreError extends Error {
  constructor(readonly code: TapeStoreErrorCode) {
    super(MESSAGES[code]);
    this.name = "TapeStoreError";
  }
}

export function validateTapeKey(value: unknown): asserts value is string {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/.test(value)) {
    throw new TapeValueError("Tape keys and digests must be SHA-256 hexadecimal strings");
  }
}

export function validateTapeSlot(input: TapeSlotIdentity): TapeSlotIdentity {
  const value = restoreTapeValue(
    captureTapeValue(input, { maxBytes: 8192, maxNodes: 16, maxDepth: 2 }),
  ) as TapeSlotIdentity;
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).length !== 4
  ) {
    throw new TapeValueError("Malformed tape slot identity");
  }
  validateTapeKey(value.key);
  validateTapeKey(value.digest);
  if (
    typeof value.itemId !== "string" ||
    !value.itemId ||
    Buffer.byteLength(value.itemId, "utf8") > 1024 ||
    !Number.isSafeInteger(value.index) ||
    value.index < 0
  ) {
    throw new TapeValueError("Malformed tape item identity");
  }
  if (value.key !== tapeDigest({ itemId: value.itemId, index: value.index })) {
    throw new TapeValueError("Tape slot key does not match its item identity");
  }
  return value;
}

/** Validate terminal state without persisting original error messages or stacks. */
export function validateTapeTerminal(input: TapeTerminal): TapeTerminal {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new TapeValueError("Malformed tape terminal state");
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (
    Object.getOwnPropertySymbols(input).length ||
    Object.keys(descriptors).length !== 3 ||
    Object.values(descriptors).some(
      (descriptor) => !("value" in descriptor) || !descriptor.enumerable,
    )
  ) {
    throw new TapeValueError("Malformed tape terminal fields");
  }
  const kind = descriptors.kind?.value;
  const invoked = descriptors.invoked?.value;
  if (kind === "success" && invoked === true && descriptors.value) {
    const value = captureTapeValue(restoreTapeValue(descriptors.value.value));
    return { kind, invoked, value };
  }
  const code = descriptors.code?.value;
  if (kind === "error" && invoked === true && code === "TARGET_FAILED") {
    return { kind, invoked, code };
  }
  if (kind === "cancelled" && invoked === false && code === "ABORTED_BEFORE_INVOCATION") {
    return { kind, invoked, code };
  }
  throw new TapeValueError("Unsupported tape terminal state");
}
