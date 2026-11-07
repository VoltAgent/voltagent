import { randomUUID } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { captureTapeValue } from "./codec.js";
import { createDirectoryTapeStore } from "./directory-store.js";
import { captureRunnerIdentity } from "./identity.js";
import { inspectTape } from "./inspect.js";
import { createRecordingRunner, createReplayRunner } from "./runner.js";
import { type TapeSlotIdentity, TapeStoreError } from "./store.js";

const manifest = {
  version: 1 as const,
  tapeId: "dir",
  runnerRevision: "runner",
  datasetRevision: "dataset",
};

function slot(id: string, index = 0): TapeSlotIdentity {
  const captured = captureRunnerIdentity({ item: { id, input: "x" }, index });
  return { key: captured.key, digest: captured.digest, itemId: id, index };
}
const success = {
  kind: "success" as const,
  invoked: true as const,
  value: captureTapeValue({ output: "ok" }),
};

async function code(promise: Promise<unknown>): Promise<string | undefined> {
  try {
    await promise;
  } catch (error) {
    return error instanceof TapeStoreError ? error.code : `other:${String(error)}`;
  }
  return undefined;
}

let base: string;
let root: string;
beforeEach(async () => {
  base = await mkdtemp(join(tmpdir(), "tape-dir-"));
  root = join(base, "tape");
});
afterEach(() => rm(base, { recursive: true, force: true }));

describe("directory tape store", () => {
  it("creates a private manifest-bound directory with hashed file names", async () => {
    const store = await createDirectoryTapeStore(root, manifest);
    const identity = slot("customer/../secret");
    await store.complete(await store.claim(identity), success);
    expect((await stat(root)).mode & 0o777).toBe(0o700);
    const names = await readdir(root);
    expect(names.sort()).toEqual(
      ["manifest.json", `claim-${identity.key}.json`, `terminal-${identity.key}.json`].sort(),
    );
    for (const name of names) {
      expect((await stat(join(root, name))).mode & 0o777).toBe(0o600);
      expect(name).not.toContain("secret");
    }
  });

  it("claims each slot once across concurrent stores and leaves no temp files", async () => {
    const stores = await Promise.all(
      Array.from({ length: 4 }, () => createDirectoryTapeStore(root, manifest)),
    );
    const identity = slot("a");
    const results = await Promise.allSettled(
      Array.from({ length: 16 }, (_, i) => stores[i % 4].claim(identity)),
    );
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(await code(stores[0].claim(identity))).toBe("SLOT_RESERVED");
    expect((await readdir(root)).filter((name) => name.startsWith(".tmp-"))).toEqual([]);
  });

  it("persists across reopen and refuses to overwrite or steal terminals", async () => {
    const first = await createDirectoryTapeStore(root, manifest);
    const identity = slot("a");
    const claim = await first.claim(identity);
    const reopened = await createDirectoryTapeStore(root, manifest);
    expect((await reopened.read(identity.key))?.terminal).toBeUndefined();
    expect(await code(reopened.complete({ ...claim, token: randomUUID() }, success))).toBe(
      "CLAIM_MISMATCH",
    );
    await reopened.complete(claim, success);
    expect(await code(first.complete(claim, success))).toBe("ALREADY_COMPLETED");
    expect((await first.read(identity.key))?.terminal?.kind).toBe("success");
    expect(await code(first.claim(identity))).toBe("SLOT_RESERVED");
    expect(await first.list()).toHaveLength(1);
  });

  it("rejects a different manifest, foreign directories, and symlinked roots", async () => {
    await createDirectoryTapeStore(root, manifest);
    expect(
      await code(createDirectoryTapeStore(root, { ...manifest, runnerRevision: "other" })),
    ).toBe("STORE_MANIFEST_MISMATCH");
    const foreign = join(base, "foreign");
    await mkdir(foreign, { mode: 0o700 });
    await writeFile(join(foreign, "notes.txt"), "mine");
    expect(await code(createDirectoryTapeStore(foreign, manifest))).toBe("STORE_UNSAFE");
    expect(await readFile(join(foreign, "notes.txt"), "utf8")).toBe("mine");
    const link = join(base, "link");
    await symlink(root, link);
    expect(await code(createDirectoryTapeStore(link, manifest))).toBe("STORE_UNSAFE");
    const open = join(base, "open");
    await mkdir(open, { mode: 0o755 });
    await chmod(open, 0o755);
    expect(await code(createDirectoryTapeStore(open, manifest))).toBe("STORE_UNSAFE");
  });

  it("fails closed on corrupt manifests, claims, and terminals without repairing them", async () => {
    const store = await createDirectoryTapeStore(root, manifest);
    const partial = slot("partial");
    await writeFile(join(root, `claim-${partial.key}.json`), '{"version":1,"ke', { mode: 0o600 });
    expect(await code(store.claim(partial))).toBe("SLOT_RESERVED");
    expect(await code(store.read(partial.key))).toBe("STORE_CORRUPT");
    expect(await code(store.list())).toBe("STORE_CORRUPT");
    expect(await readFile(join(root, `claim-${partial.key}.json`), "utf8")).toBe(
      '{"version":1,"ke',
    );

    const other = join(base, "other");
    const second = await createDirectoryTapeStore(other, manifest);
    const identity = slot("b");
    await second.complete(await second.claim(identity), success);
    await writeFile(join(other, `terminal-${identity.key}.json`), "{}", { flag: "w" });
    expect(await code(second.read(identity.key))).toBe("STORE_CORRUPT");

    await writeFile(join(other, "manifest.json"), "not json");
    expect(await code(createDirectoryTapeStore(other, manifest))).toBe("STORE_CORRUPT");
  });

  it("treats a terminal without its claim as corruption and ignores stray files", async () => {
    const store = await createDirectoryTapeStore(root, manifest);
    const identity = slot("c");
    await store.complete(await store.claim(identity), success);
    await writeFile(join(root, ".tmp-leftover"), "partial");
    await writeFile(join(root, "README"), "unrelated");
    expect(await store.list()).toHaveLength(1);
    const orphan = slot("d");
    await writeFile(join(root, `terminal-${orphan.key}.json`), "{}");
    expect(await code(store.list())).toBe("STORE_CORRUPT");
    expect(await readdir(root)).toContain(".tmp-leftover");
  });

  it("rejects oversized and non-regular record files before parsing", async () => {
    const store = await createDirectoryTapeStore(root, manifest);
    const big = slot("big");
    await writeFile(join(root, `claim-${big.key}.json`), "x".repeat(70 * 1024));
    expect(await code(store.read(big.key))).toBe("STORE_CORRUPT");
    const linked = slot("linked");
    await symlink(join(root, "manifest.json"), join(root, `claim-${linked.key}.json`));
    expect(await code(store.read(linked.key))).toBe("STORE_UNSAFE");
    const dir = slot("dir");
    await mkdir(join(root, `claim-${dir.key}.json`));
    expect(await code(store.read(dir.key))).toBe("STORE_UNSAFE");
  });

  it("enforces capacity and validates inputs", async () => {
    const store = await createDirectoryTapeStore(root, manifest, { maxEntries: 1 });
    await store.claim(slot("a"));
    expect(await code(store.claim(slot("b", 1)))).toBe("STORE_CAPACITY");
    await expect(createDirectoryTapeStore("", manifest)).rejects.toThrow(/explicit/);
    await expect(
      createDirectoryTapeStore(join(base, "x"), manifest, { maxEntries: 0 }),
    ).rejects.toThrow(/capacity/);
    await expect(store.read("../../etc/passwd")).rejects.toThrow();
  });

  it("keeps the tape listable and inspectable when racing claims exceed the advisory cap", async () => {
    const store = await createDirectoryTapeStore(root, manifest, { maxEntries: 2 });
    const results = await Promise.allSettled(
      Array.from({ length: 8 }, (_, index) => store.claim(slot(`item-${index}`, index))),
    );
    const admitted = results.filter((result) => result.status === "fulfilled").length;
    expect(admitted).toBeGreaterThanOrEqual(2);
    expect(await store.list()).toHaveLength(admitted);
    const reopened = await createDirectoryTapeStore(root, manifest, { maxEntries: 2 });
    expect((await inspectTape(reopened)).claims).toBe(admitted);
    expect((await reopened.read(slot("item-0", 0).key)) !== undefined || admitted > 0).toBe(true);
  });

  it("leaves a reserved, unresolved slot when the claim directory fsync fails", async () => {
    const store = await createDirectoryTapeStore(root, manifest);
    const identity = slot("a");
    const failing = {
      ...store,
      claim: async (input: TapeSlotIdentity) => {
        // Model the fsync failing after the exclusive create succeeded.
        await store.claim(input);
        throw new TapeStoreError("DURABILITY_UNSUPPORTED");
      },
    };
    let calls = 0;
    const { runner } = createRecordingRunner({
      store: failing,
      manifest,
      runner: () => {
        calls++;
        return "x";
      },
    });
    await expect(runner({ item: { id: "a", input: "x" }, index: 0 })).rejects.toMatchObject({
      code: "DURABILITY_UNSUPPORTED",
    });
    expect(calls).toBe(0);
    expect(await code(store.claim(identity))).toBe("SLOT_RESERVED");
    const replay = createReplayRunner({ store, manifest });
    await expect(replay({ item: { id: "a", input: "x" }, index: 0 })).rejects.toMatchObject({
      code: "UNRESOLVED_RECORD",
    });
  });

  it("ignores stale temp files on open and list without deleting them", async () => {
    await mkdir(root, { mode: 0o700 });
    await writeFile(join(root, ".tmp-stale-before-manifest"), "partial");
    const store = await createDirectoryTapeStore(root, manifest);
    await store.complete(await store.claim(slot("a")), success);
    await writeFile(join(root, ".tmp-stale-after"), "partial");
    const reopened = await createDirectoryTapeStore(root, manifest);
    expect(await reopened.list()).toHaveLength(1);
    expect(await readdir(root)).toEqual(
      expect.arrayContaining([".tmp-stale-before-manifest", ".tmp-stale-after"]),
    );
  });
});
