import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { NodeFilesystemBackend } from "./backends/filesystem";

describe("NodeFilesystemBackend containment", () => {
  it("keeps paths within rootDir by default", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "va-workspace-"));
    try {
      const backend = new NodeFilesystemBackend({ rootDir: root });

      const writeResult = await backend.write("/notes/hello.txt", "hello");
      expect(writeResult.error).toBeUndefined();

      const stored = await readFile(path.join(root, "notes", "hello.txt"), "utf-8");
      expect(stored).toBe("hello");

      const traversal = await backend.write("/../outside.txt", "nope");
      expect(traversal.error).toContain("outside root directory");

      const readResult = await backend.read("/etc/hosts");
      expect(readResult).toContain("ENOENT");
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});
