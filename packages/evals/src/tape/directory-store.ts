import { randomUUID } from "node:crypto";
import { constants } from "node:fs";
import { link, lstat, mkdir, open, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { TapeValueError, serializeTapeJson, tapeDigest } from "./codec.js";
import { type TapeManifest, tapeManifestDigest, validateTapeManifest } from "./identity.js";
import {
  type TapeClaim,
  type TapeEntry,
  type TapeStore,
  TapeStoreError,
  type TapeTerminal,
  validateTapeKey,
  validateTapeSlot,
  validateTapeTerminal,
} from "./store.js";

export interface DirectoryTapeStoreOptions {
  /** Claim admission limit. Advisory under concurrency; list() and read() ignore it. */
  maxEntries?: number;
}

const MANIFEST_FILE = "manifest.json";
const TEMP_PREFIX = ".tmp-";
const CLAIM_FILE = /^claim-([a-f0-9]{64})\.json$/;
const TERMINAL_FILE = /^terminal-([a-f0-9]{64})\.json$/;
const MAX_CLAIM_BYTES = 64 * 1024;
const MAX_TERMINAL_BYTES = 24 * 1024 * 1024;
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
// Files are never followed through symlinks; unavailable (0) on platforms without the flag.
const NOFOLLOW = constants.O_NOFOLLOW ?? 0;
const DURABILITY_ERRORS = new Set(["EINVAL", "ENOTSUP", "EOPNOTSUPP", "EPERM", "EISDIR", "EBADF"]);

function errno(error: unknown): string | undefined {
  return typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : undefined;
}

/** Translate raw fs failures into typed errors that never expose paths or messages. */
function ioFailure(error: unknown, durability = false): TapeStoreError {
  if (error instanceof TapeStoreError) {
    return error;
  }
  if (errno(error) === "ELOOP") {
    return new TapeStoreError("STORE_UNSAFE");
  }
  return new TapeStoreError(
    durability && DURABILITY_ERRORS.has(errno(error) ?? "") ? "DURABILITY_UNSUPPORTED" : "STORE_IO",
  );
}

async function fsyncDirectory(path: string): Promise<void> {
  try {
    const handle = await open(path, constants.O_RDONLY | (constants.O_DIRECTORY ?? 0));
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
  } catch (error) {
    throw ioFailure(error, true);
  }
}

/** Create a new regular file, write it, and fsync it. Fails if the path exists. */
async function writeExclusive(path: string, text: string): Promise<void> {
  const handle = await open(
    path,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NOFOLLOW,
    0o600,
  );
  try {
    await handle.writeFile(text, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
}

/** Read one bounded regular file; undefined when absent. */
async function readBounded(path: string, maxBytes: number): Promise<string | undefined> {
  let handle: Awaited<ReturnType<typeof open>>;
  try {
    handle = await open(path, constants.O_RDONLY | NOFOLLOW);
  } catch (error) {
    if (errno(error) === "ENOENT") {
      return undefined;
    }
    throw ioFailure(error);
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile()) {
      throw new TapeStoreError("STORE_UNSAFE");
    }
    if (stats.size > maxBytes) {
      throw new TapeStoreError("STORE_CORRUPT");
    }
    const buffer = Buffer.alloc(stats.size);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) {
        throw new TapeStoreError("STORE_CORRUPT");
      }
      offset += bytesRead;
    }
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch (error) {
    throw error instanceof TypeError ? new TapeStoreError("STORE_CORRUPT") : ioFailure(error);
  } finally {
    await handle.close();
  }
}

function parseRecord(text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new TapeStoreError("STORE_CORRUPT");
  }
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new TapeStoreError("STORE_CORRUPT");
  }
  return value as Record<string, unknown>;
}

function hasExactKeys(value: object, keys: string[]): boolean {
  const own = Object.getOwnPropertyNames(value).sort();
  const expected = [...keys].sort();
  return own.length === expected.length && own.every((key, index) => key === expected[index]);
}

function encode(record: unknown, maxBytes: number): string {
  try {
    return serializeTapeJson(record, maxBytes);
  } catch (error) {
    throw error instanceof TapeValueError ? new TapeStoreError("STORE_IO") : error;
  }
}

/** Publish bytes under `finalPath` only if nothing exists there; returns false when it does. */
async function publishNoClobber(root: string, finalPath: string, text: string): Promise<boolean> {
  const temp = join(root, `${TEMP_PREFIX}${randomUUID()}`);
  try {
    await writeExclusive(temp, text);
    try {
      await link(temp, finalPath);
    } catch (error) {
      if (errno(error) === "EEXIST") {
        return false;
      }
      throw ioFailure(error, true);
    }
  } catch (error) {
    throw ioFailure(error);
  } finally {
    // Only the temp file created above is removed; the published name is untouched.
    await unlink(temp).catch(() => undefined);
  }
  await fsyncDirectory(root);
  return true;
}

async function verifyPrivateDirectory(root: string): Promise<void> {
  const stats = await lstat(root);
  if (!stats.isDirectory() || stats.isSymbolicLink()) {
    throw new TapeStoreError("STORE_UNSAFE");
  }
  if (process.platform !== "win32") {
    const uid = process.getuid?.();
    if ((uid !== undefined && stats.uid !== uid) || (stats.mode & 0o077) !== 0) {
      throw new TapeStoreError("STORE_UNSAFE");
    }
  }
}

function manifestRecord(manifest: TapeManifest): string {
  return encode({ version: 1, digest: tapeManifestDigest(manifest), manifest }, MAX_CLAIM_BYTES);
}

async function verifyManifest(root: string, manifest: TapeManifest): Promise<void> {
  const text = await readBounded(join(root, MANIFEST_FILE), MAX_CLAIM_BYTES);
  if (text === undefined) {
    throw new TapeStoreError("STORE_CORRUPT");
  }
  const record = parseRecord(text);
  if (!hasExactKeys(record, ["version", "digest", "manifest"]) || record.version !== 1) {
    throw new TapeStoreError("STORE_CORRUPT");
  }
  let stored: TapeManifest;
  try {
    stored = validateTapeManifest(record.manifest);
  } catch {
    throw new TapeStoreError("STORE_CORRUPT");
  }
  if (record.digest !== tapeManifestDigest(stored)) {
    throw new TapeStoreError("STORE_CORRUPT");
  }
  if (record.digest !== tapeManifestDigest(manifest)) {
    throw new TapeStoreError("STORE_MANIFEST_MISMATCH");
  }
}

function parseClaim(text: string, key: string, manifestDigest: string): TapeClaim {
  const record = parseRecord(text);
  try {
    if (
      !hasExactKeys(record, [
        "version",
        "key",
        "digest",
        "itemId",
        "index",
        "manifestDigest",
        "token",
        "claimedAt",
      ]) ||
      record.version !== 1 ||
      record.manifestDigest !== manifestDigest ||
      typeof record.token !== "string" ||
      !UUID.test(record.token) ||
      !Number.isSafeInteger(record.claimedAt)
    ) {
      throw new TapeValueError();
    }
    validateTapeSlot({
      key: record.key as string,
      digest: record.digest as string,
      itemId: record.itemId as string,
      index: record.index as number,
    });
    if (record.key !== key) {
      throw new TapeValueError();
    }
  } catch {
    throw new TapeStoreError("STORE_CORRUPT");
  }
  return record as unknown as TapeClaim;
}

function parseTerminal(text: string, claim: TapeClaim): TapeTerminal {
  const record = parseRecord(text);
  try {
    if (
      !hasExactKeys(record, ["version", "claimDigest", "terminal"]) ||
      record.version !== 1 ||
      record.claimDigest !== tapeDigest(claim)
    ) {
      throw new TapeValueError();
    }
    return validateTapeTerminal(record.terminal as TapeTerminal);
  } catch {
    throw new TapeStoreError("STORE_CORRUPT");
  }
}

/**
 * Durable, crash-tolerant tape store rooted in one explicit private directory.
 *
 * Claims are created with `wx` and fsynced (file and directory) before `claim()`
 * resolves, so a claim survives a crash that happens during target invocation.
 * Terminal records are published by no-clobber hard link. Partial, corrupt, or
 * foreign files are never repaired, overwritten, or stolen: a bad claim stays
 * reserved and surfaces as `STORE_CORRUPT`. Integrity digests detect accidental
 * damage, not a malicious writer, and files are not encrypted.
 */
export async function createDirectoryTapeStore(
  root: string,
  manifest: TapeManifest,
  options: DirectoryTapeStoreOptions = {},
): Promise<TapeStore> {
  if (typeof root !== "string" || root.length === 0 || root.includes("\0")) {
    throw new TapeValueError("Tape directory must be an explicit nonempty path");
  }
  const boundManifest = Object.freeze(validateTapeManifest(manifest));
  const manifestDigest = tapeManifestDigest(boundManifest);
  const maxEntries = options.maxEntries ?? 10_000;
  if (!Number.isSafeInteger(maxEntries) || maxEntries < 1 || maxEntries > 100_000) {
    throw new TapeValueError("Directory tape capacity must be an integer from 1 to 100000");
  }
  const claimPath = (key: string) => join(root, `claim-${key}.json`);
  const terminalPath = (key: string) => join(root, `terminal-${key}.json`);

  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    await verifyPrivateDirectory(root);
    // Durability support is probed before any claim can precede a target call.
    await fsyncDirectory(root);
    const manifestPath = join(root, MANIFEST_FILE);
    const existing = await readdir(root);
    if (existing.includes(MANIFEST_FILE)) {
      await verifyManifest(root, boundManifest);
    } else {
      // Only this module's own interrupted temp files may share a not-yet-initialized directory.
      if (existing.some((name) => !name.startsWith(TEMP_PREFIX))) {
        throw new TapeStoreError("STORE_UNSAFE");
      }
      // Losing the publish race is fine: the winner's manifest is verified below.
      await publishNoClobber(root, manifestPath, manifestRecord(boundManifest));
      await verifyManifest(root, boundManifest);
    }
  } catch (error) {
    throw ioFailure(error);
  }

  async function claimNames(): Promise<string[]> {
    try {
      return (await readdir(root)).filter((name) => CLAIM_FILE.test(name)).sort();
    } catch (error) {
      throw ioFailure(error);
    }
  }

  async function readEntry(key: string): Promise<TapeEntry | undefined> {
    const claimText = await readBounded(claimPath(key), MAX_CLAIM_BYTES);
    const terminalText = await readBounded(terminalPath(key), MAX_TERMINAL_BYTES);
    if (claimText === undefined) {
      // A terminal with no claim means files were removed or tampered with.
      if (terminalText !== undefined) {
        throw new TapeStoreError("STORE_CORRUPT");
      }
      return undefined;
    }
    const claim = parseClaim(claimText, key, manifestDigest);
    return terminalText === undefined
      ? { claim }
      : { claim, terminal: parseTerminal(terminalText, claim) };
  }

  return {
    manifest: boundManifest,
    async claim(input) {
      const identity = validateTapeSlot(input);
      // Advisory: the count is not atomic with the `wx` write, so concurrent claimers
      // (especially across processes) can exceed the cap. Reads are never capped.
      if ((await claimNames()).length >= maxEntries) {
        throw new TapeStoreError("STORE_CAPACITY");
      }
      const claim: TapeClaim = {
        ...identity,
        version: 1,
        manifestDigest,
        token: randomUUID(),
        claimedAt: Date.now(),
      };
      try {
        await writeExclusive(claimPath(identity.key), encode(claim, MAX_CLAIM_BYTES));
      } catch (error) {
        // Any pre-existing file, even a corrupt one, keeps the slot reserved.
        throw errno(error) === "EEXIST"
          ? new TapeStoreError("SLOT_RESERVED")
          : ioFailure(error, true);
      }
      // The claim file may exist if this fails; it stays reserved and the target is not invoked.
      await fsyncDirectory(root);
      return claim;
    },
    async complete(claim, terminal) {
      const claimDigest = tapeDigest(claim);
      validateTapeKey(claim.key);
      const claimText = await readBounded(claimPath(claim.key), MAX_CLAIM_BYTES);
      if (claimText === undefined) {
        throw new TapeStoreError("CLAIM_MISMATCH");
      }
      const stored = parseClaim(claimText, claim.key, manifestDigest);
      if (tapeDigest(stored) !== claimDigest) {
        throw new TapeStoreError("CLAIM_MISMATCH");
      }
      const captured = validateTapeTerminal(terminal);
      const text = encode({ version: 1, claimDigest, terminal: captured }, MAX_TERMINAL_BYTES);
      const published = await publishNoClobber(root, terminalPath(claim.key), text);
      if (!published) {
        throw new TapeStoreError("ALREADY_COMPLETED");
      }
    },
    async read(key) {
      validateTapeKey(key);
      return readEntry(key);
    },
    async list() {
      // The claim cap is admission-only; reading must work even if racing claims exceeded it.
      const names = await claimNames();
      const keys = new Set(names.map((name) => CLAIM_FILE.exec(name)?.[1] as string));
      for (const name of await readdir(root).catch((error) => {
        throw ioFailure(error);
      })) {
        const orphan = TERMINAL_FILE.exec(name)?.[1];
        if (orphan !== undefined && !keys.has(orphan)) {
          throw new TapeStoreError("STORE_CORRUPT");
        }
      }
      const entries: TapeEntry[] = [];
      for (const key of keys) {
        const entry = await readEntry(key);
        if (!entry) {
          throw new TapeStoreError("STORE_CORRUPT");
        }
        entries.push(entry);
      }
      return entries;
    },
  };
}
