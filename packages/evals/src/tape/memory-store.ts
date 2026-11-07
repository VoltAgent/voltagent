import { randomUUID } from "node:crypto";
import { TapeValueError, tapeDigest } from "./codec.js";
import { type TapeManifest, tapeManifestDigest, validateTapeManifest } from "./identity.js";
import {
  type TapeClaim,
  type TapeEntry,
  type TapeStore,
  TapeStoreError,
  validateTapeKey,
  validateTapeSlot,
  validateTapeTerminal,
} from "./store.js";

export interface MemoryTapeStoreOptions {
  /** Bounds retained evidence; callers create a new tape when it is full. */
  maxEntries?: number;
}

/**
 * Process-local atomic claims. This implementation is intentionally not durable;
 * use a directory store when evidence must survive process termination.
 */
export function createMemoryTapeStore(
  manifest: TapeManifest,
  options: MemoryTapeStoreOptions = {},
): TapeStore {
  const boundManifest = Object.freeze(validateTapeManifest(manifest));
  const manifestDigest = tapeManifestDigest(boundManifest);
  const maxEntries = options.maxEntries ?? 10_000;
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 100_000) {
    throw new TapeValueError("Memory tape capacity must be an integer from 1 to 100000");
  }
  const entries = new Map<string, TapeEntry>();
  return {
    manifest: boundManifest,
    async claim(input) {
      const identity = validateTapeSlot(input);
      if (entries.has(identity.key)) {
        throw new TapeStoreError("SLOT_RESERVED");
      }
      if (entries.size >= maxEntries) {
        throw new TapeStoreError("STORE_CAPACITY");
      }
      const claim: TapeClaim = {
        ...identity,
        version: 1,
        manifestDigest,
        token: randomUUID(),
        claimedAt: Date.now(),
      };
      // No await between checking and reserving the slot.
      entries.set(identity.key, { claim });
      return structuredClone(claim);
    },
    async complete(claim, terminal) {
      // Strict bounded capture rejects getters before reading caller fields.
      const claimDigest = tapeDigest(claim);
      const entry = entries.get(claim.key);
      if (!entry || tapeDigest(entry.claim) !== claimDigest) {
        throw new TapeStoreError("CLAIM_MISMATCH");
      }
      if (entry.terminal !== undefined) {
        throw new TapeStoreError("ALREADY_COMPLETED");
      }
      const captured = validateTapeTerminal(terminal);
      entry.terminal = captured;
    },
    async read(key) {
      validateTapeKey(key);
      const entry = entries.get(key);
      return entry ? structuredClone(entry) : undefined;
    },
    async list() {
      return Array.from(entries.values(), (entry) => structuredClone(entry));
    },
  };
}
