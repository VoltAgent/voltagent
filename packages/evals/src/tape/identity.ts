import type { ExperimentDatasetItem, ExperimentRunnerContext } from "../experiment/types.js";
import { TapeValueError, captureTapeValue, restoreTapeValue, tapeDigest } from "./codec.js";

export interface TapeManifest {
  version: 1;
  tapeId: string;
  runnerRevision: string;
  datasetRevision: string;
}

export interface CapturedRunnerIdentity<
  Item extends ExperimentDatasetItem = ExperimentDatasetItem,
> {
  /** Stable slot: original dataset item ID and index, never a filesystem path. */
  key: string;
  /** Full supported item data and evaluation context compatibility fingerprint. */
  digest: string;
  item: Item;
  index: number;
  totalPresent: boolean;
  total: number | undefined;
  tagsPresent: boolean;
  tags: readonly string[] | undefined;
}

function dataField(object: object, name: string): { present: boolean; value: unknown } {
  const descriptor = Object.getOwnPropertyDescriptor(object, name);
  if (!descriptor) {
    return { present: false, value: undefined };
  }
  if (!("value" in descriptor) || !descriptor.enumerable) {
    throw new TapeValueError("Tape identity fields must be enumerable data properties");
  }
  return { present: true, value: descriptor.value };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function requireText(value: unknown): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || Buffer.byteLength(value, "utf8") > 1024) {
    throw new TapeValueError("Tape identifiers and revisions must be nonempty bounded strings");
  }
}

/** Revision labels are caller assertions, not inferred source-code hashes. */
export function validateTapeManifest(input: unknown): TapeManifest {
  const value = restoreTapeValue(
    captureTapeValue(input, { maxBytes: 8192, maxNodes: 16, maxDepth: 2 }),
  );
  if (!isPlainRecord(value) || Object.keys(value).length !== 4 || value.version !== 1) {
    throw new TapeValueError("Unsupported tape manifest schema");
  }
  const allowed = new Set(["version", "tapeId", "runnerRevision", "datasetRevision"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new TapeValueError("Unknown tape manifest field");
  }
  requireText(value.tapeId);
  requireText(value.runnerRevision);
  requireText(value.datasetRevision);
  return {
    version: 1,
    tapeId: value.tapeId,
    runnerRevision: value.runnerRevision,
    datasetRevision: value.datasetRevision,
  };
}

export function tapeManifestDigest(manifest: TapeManifest): string {
  return tapeDigest(validateTapeManifest(manifest));
}

/**
 * Capture synchronously before any claim I/O. The target receives the returned
 * detached item so later caller mutations cannot invalidate the saved identity.
 * Run IDs, start times, service clients and signals are deliberately not replay
 * compatibility fields; replay is recorded evidence, not a new target execution.
 */
export function captureRunnerIdentity<Item extends ExperimentDatasetItem>(
  context: ExperimentRunnerContext<Item>,
): CapturedRunnerIdentity<Item> {
  if (!isPlainRecord(context)) {
    throw new TapeValueError("Tape runner context must be a plain object");
  }
  const item = restoreTapeValue(captureTapeValue(dataField(context, "item").value));
  if (!isPlainRecord(item)) {
    throw new TapeValueError("Tape dataset items must be plain objects");
  }
  requireText(item.id);
  const index = dataField(context, "index").value;
  if (typeof index !== "number" || !Number.isSafeInteger(index) || index < 0) {
    throw new TapeValueError("Tape item index must be a nonnegative safe integer");
  }
  const total = dataField(context, "total");
  if (
    total.value !== undefined &&
    (typeof total.value !== "number" || !Number.isSafeInteger(total.value) || total.value < 0)
  ) {
    throw new TapeValueError("Tape total must be a nonnegative safe integer when defined");
  }
  const runtime = dataField(context, "runtime").value;
  if (runtime !== undefined && !isPlainRecord(runtime)) {
    throw new TapeValueError("Tape runtime metadata must be a plain object when defined");
  }
  const tags =
    runtime === undefined ? { present: false, value: undefined } : dataField(runtime, "tags");
  const detachedTags = restoreTapeValue(captureTapeValue(tags.value));
  if (
    detachedTags !== undefined &&
    (!Array.isArray(detachedTags) || detachedTags.some((tag) => typeof tag !== "string"))
  ) {
    throw new TapeValueError("Tape runtime tags must be an array of strings when defined");
  }
  const fingerprint = {
    item,
    index,
    totalPresent: total.present,
    total: total.value,
    tagsPresent: tags.present,
    tags: detachedTags,
  };
  return {
    ...fingerprint,
    key: tapeDigest({ itemId: item.id, index }),
    digest: tapeDigest(fingerprint),
    item: item as Item,
    total: total.value as number | undefined,
    tags: detachedTags as string[] | undefined,
  };
}
