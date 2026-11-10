import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { NodeFilesystemBackend, WorkspaceFilesystem } from "./index";

describe("WorkspaceFilesystem", () => {
  it("reports byte sizes when Buffer is unavailable", async () => {
    const filesystem = new WorkspaceFilesystem();
    await filesystem.write("/content.txt", "你好");
    vi.stubGlobal("Buffer", undefined);
    try {
      expect((await filesystem.stat("/content.txt"))?.size).toBe(6);
      expect((await filesystem.lsInfo("/"))[0].size).toBe(6);
      expect((await filesystem.globInfo("*.txt", "/"))[0].size).toBe(6);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  describe.each([
    ["ASCII", "hello", 5],
    ["empty", "", 0],
    ["Chinese", "你好", 6],
    ["emoji and newline", "a\n😀", 6],
    ["combining mark", "e\u0301", 3],
  ] as const)("UTF-8 byte sizes for %s files", (_label, content, expectedSize) => {
    it.each(["stat", "lsInfo", "globInfo"] as const)(
      "reports byte sizes via %s",
      async (operation) => {
        const root = await mkdtemp(path.join(tmpdir(), "va-byte-size-"));
        try {
          const memory = new WorkspaceFilesystem();
          const disk = new WorkspaceFilesystem({
            backend: new NodeFilesystemBackend({ rootDir: root }),
          });
          for (const filesystem of [disk, memory]) {
            const result = await filesystem.write("/content.txt", content);
            expect(result.error).toBeUndefined();
            expect((await filesystem.readRaw("/content.txt")).content.join("\n")).toBe(content);
            const info =
              operation === "stat"
                ? await filesystem.stat("/content.txt")
                : operation === "lsInfo"
                  ? (await filesystem.lsInfo("/"))[0]
                  : (await filesystem.globInfo("*.txt", "/"))[0];
            expect(info?.size).toBe(expectedSize);
          }
        } finally {
          await rm(root, { recursive: true, force: true });
        }
      },
    );
  });

  it("writes, reads, edits, and deletes files", async () => {
    const filesystem = new WorkspaceFilesystem();

    const writeResult = await filesystem.write("/notes/summary.md", "hello", {
      ensureDirs: true,
    });
    expect(writeResult.error).toBeUndefined();

    const readResult = await filesystem.read("/notes/summary.md");
    expect(readResult).toContain("hello");

    const editResult = await filesystem.edit("/notes/summary.md", "hello", "hi");
    expect(editResult.error).toBeUndefined();

    const updated = await filesystem.read("/notes/summary.md");
    expect(updated).toContain("hi");

    const deleteResult = await filesystem.delete("/notes/summary.md");
    expect(deleteResult.error).toBeUndefined();

    const list = await filesystem.lsInfo("/notes");
    const fileNames = list.map((entry) => entry.path);
    expect(fileNames).not.toContain("/notes/summary.md");
  });

  it("blocks write operations when read-only", async () => {
    const filesystem = new WorkspaceFilesystem({
      readOnly: true,
      files: { "/notes/a.txt": "hello" },
    });

    const writeResult = await filesystem.write("/notes/b.txt", "blocked");
    expect(writeResult.error).toContain("read-only");
  });
});
