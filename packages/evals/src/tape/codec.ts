import { createHash } from "node:crypto";
import { safeStringify } from "@voltagent/internal";

export type TapeValue =
  | { kind: "undefined" | "null" | "negative-zero" }
  | { kind: "boolean"; value: boolean }
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "array"; value: TapeValue[] }
  | { kind: "object"; value: [string, TapeValue][] };

export interface TapeValueLimits {
  maxBytes: number;
  maxNodes: number;
  maxDepth: number;
  maxCollectionLength: number;
}
const DEFAULT_LIMITS: Readonly<TapeValueLimits> = Object.freeze({
  maxBytes: 8 * 1024 * 1024,
  maxNodes: 50_000,
  maxDepth: 64,
  maxCollectionLength: 10_000,
});

/** Errors never contain source values, property names, or serialization fallbacks. */
export class TapeValueError extends Error {
  readonly code = "TAPE_INVALID_VALUE";
  constructor(message = "Tape values must be bounded plain finite data") {
    super(message);
    this.name = "TapeValueError";
  }
}
function limitsFor(overrides: Partial<TapeValueLimits> = {}): TapeValueLimits {
  for (const [key, value] of Object.entries(overrides)) {
    if (!Object.hasOwn(DEFAULT_LIMITS, key) || !Number.isSafeInteger(value) || value < 1) {
      throw new TapeValueError("Tape value limits must be positive integers with known names");
    }
  }
  const limits = { ...DEFAULT_LIMITS, ...overrides };
  if (limits.maxDepth > 128 || limits.maxBytes > 64 * 1024 * 1024 || limits.maxNodes > 500_000) {
    throw new TapeValueError("Tape value limits exceed supported bounds");
  }
  return limits;
}
class Budget {
  private nodes = 0;
  private bytes = 0;
  constructor(readonly limits: TapeValueLimits) {}
  node(depth: number): void {
    this.nodes += 1;
    if (depth > this.limits.maxDepth || this.nodes > this.limits.maxNodes) {
      throw new TapeValueError("Tape value exceeds the depth or node limit");
    }
  }
  text(value: string): void {
    this.bytes += Buffer.byteLength(value, "utf8");
    if (this.bytes > this.limits.maxBytes) {
      throw new TapeValueError("Tape value exceeds the byte limit");
    }
  }
  collection(length: number): void {
    if (length > this.limits.maxCollectionLength) {
      throw new TapeValueError("Tape collection exceeds the length limit");
    }
  }
}
function ownData(object: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(object, key);
  if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
    throw new TapeValueError("Tape values must contain only enumerable own data properties");
  }
  return descriptor.value;
}
function plainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
function assertNoSymbols(value: object): void {
  if (Object.getOwnPropertySymbols(value).length > 0) {
    throw new TapeValueError("Tape values must not contain symbol properties");
  }
}
function assertDenseArray(value: unknown[]): void {
  if (Object.getPrototypeOf(value) !== Array.prototype) {
    throw new TapeValueError("Tape arrays must have the ordinary array prototype");
  }
  assertNoSymbols(value);
  // Array length is the sole permitted non-enumerable own property.
  if (Object.getOwnPropertyNames(value).length !== value.length + 1) {
    throw new TapeValueError("Tape arrays must be dense without extra properties");
  }
  for (let index = 0; index < value.length; index++) {
    ownData(value, String(index));
  }
}
export function serializeTapeJson(value: unknown, maxBytes: number): string {
  const text = safeStringify(value);
  if (typeof text !== "string" || text.startsWith("SAFE_STRINGIFY_ERROR:")) {
    throw new TapeValueError("Tape value serialization failed");
  }
  if (Buffer.byteLength(text, "utf8") > maxBytes) {
    throw new TapeValueError("Encoded tape value exceeds the byte limit");
  }
  return text;
}

/** Capture before awaiting store I/O; the runner must receive the detached value. */
export function captureTapeValue(input: unknown, overrides?: Partial<TapeValueLimits>): TapeValue {
  const budget = new Budget(limitsFor(overrides));
  const ancestors = new Set<object>();
  function visit(value: unknown, depth: number): TapeValue {
    budget.node(depth);
    if (value === undefined) {
      return { kind: "undefined" };
    }
    if (value === null) {
      return { kind: "null" };
    }
    if (typeof value === "boolean") {
      return { kind: "boolean", value };
    }
    if (typeof value === "number") {
      if (!Number.isFinite(value)) {
        throw new TapeValueError();
      }
      return Object.is(value, -0) ? { kind: "negative-zero" } : { kind: "number", value };
    }
    if (typeof value === "string") {
      budget.text(value);
      return { kind: "string", value };
    }
    if (typeof value !== "object" || ancestors.has(value)) {
      throw new TapeValueError();
    }
    assertNoSymbols(value);
    ancestors.add(value);
    try {
      if (Array.isArray(value)) {
        budget.collection(value.length);
        assertDenseArray(value);
        const entries: TapeValue[] = [];
        for (let index = 0; index < value.length; index++) {
          entries.push(visit(ownData(value, String(index)), depth + 1));
        }
        return { kind: "array", value: entries };
      }
      if (!plainObject(value)) {
        throw new TapeValueError();
      }
      const keys = Object.getOwnPropertyNames(value).sort();
      budget.collection(keys.length);
      const entries: [string, TapeValue][] = [];
      for (const key of keys) {
        budget.text(key);
        entries.push([key, visit(ownData(value, key), depth + 1)]);
      }
      return { kind: "object", value: entries };
    } finally {
      ancestors.delete(value);
    }
  }
  const encoded = visit(input, 0);
  serializeTapeJson(encoded, budget.limits.maxBytes);
  return encoded;
}

/** Validate an untrusted encoded tree before returning fresh ordinary JS data. */
export function restoreTapeValue(input: unknown, overrides?: Partial<TapeValueLimits>): unknown {
  const budget = new Budget(limitsFor(overrides));
  const ancestors = new Set<object>();
  function visit(node: unknown, depth: number): unknown {
    budget.node(depth);
    if (!plainObject(node) || ancestors.has(node)) {
      throw new TapeValueError("Malformed encoded tape value");
    }
    assertNoSymbols(node);
    const kind = ownData(node, "kind");
    const keys = Object.getOwnPropertyNames(node);
    const scalarEmpty = kind === "undefined" || kind === "null" || kind === "negative-zero";
    if (
      keys.length !== (scalarEmpty ? 1 : 2) ||
      keys.some((key) => key !== "kind" && key !== "value")
    ) {
      throw new TapeValueError("Malformed encoded tape fields");
    }
    if (kind === "undefined") {
      return undefined;
    }
    if (kind === "null") {
      return null;
    }
    if (kind === "negative-zero") {
      return -0;
    }
    const value = ownData(node, "value");
    if (kind === "boolean" && typeof value === "boolean") {
      return value;
    }
    if (kind === "number" && typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (kind === "string" && typeof value === "string") {
      budget.text(value);
      return value;
    }
    if ((kind !== "array" && kind !== "object") || !Array.isArray(value)) {
      throw new TapeValueError("Malformed encoded tape kind or value");
    }
    budget.collection(value.length);
    assertDenseArray(value);
    ancestors.add(node);
    try {
      if (kind === "array") {
        return Array.from({ length: value.length }, (_, index) =>
          visit(ownData(value, String(index)), depth + 1),
        );
      }
      const result: Record<string, unknown> = {};
      let previous: string | undefined;
      for (let index = 0; index < value.length; index++) {
        const pair = ownData(value, String(index));
        if (!Array.isArray(pair) || pair.length !== 2) {
          throw new TapeValueError("Malformed encoded object entry");
        }
        assertDenseArray(pair);
        const key = ownData(pair, "0");
        if (typeof key !== "string" || (previous !== undefined && key <= previous)) {
          throw new TapeValueError("Encoded object keys must be unique and sorted");
        }
        budget.text(key);
        Object.defineProperty(result, key, {
          value: visit(ownData(pair, "1"), depth + 1),
          enumerable: true,
          writable: true,
          configurable: true,
        });
        previous = key;
      }
      return result;
    } finally {
      ancestors.delete(node);
    }
  }
  const restored = visit(input, 0);
  // Re-encoding also bounds structural tag/escaping overhead, not just strings.
  captureTapeValue(restored, budget.limits);
  return restored;
}

export function tapeDigest(value: unknown, limits?: Partial<TapeValueLimits>): string {
  const resolved = limitsFor(limits);
  const encoded = captureTapeValue(value, resolved);
  return createHash("sha256").update(serializeTapeJson(encoded, resolved.maxBytes)).digest("hex");
}
