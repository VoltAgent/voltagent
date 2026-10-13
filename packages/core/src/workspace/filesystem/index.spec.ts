import { describe, expect, it } from "vitest";
import { WorkspaceFilesystem } from "./index";

describe("WorkspaceFilesystem", () => {
  it("creates parent directories when mkdir is recursive", async () => {
    const filesystem = new WorkspaceFilesystem();

    expect((await filesystem.mkdir("/tasks/research/results")).error).toBeUndefined();

    for (const path of ["/tasks", "/tasks/research", "/tasks/research/results"]) {
      expect(await filesystem.exists(path)).toBe(true);
      expect(await filesystem.stat(path)).toMatchObject({ path: `${path}/`, is_dir: true });
    }

    expect((await filesystem.mkdir("/tasks/summary", false)).error).toBeUndefined();
    expect((await filesystem.rmdir("/tasks", true)).error).toBeUndefined();
    expect(await filesystem.exists("/tasks")).toBe(false);
    expect(await filesystem.exists("/tasks/research/results")).toBe(false);
  });

  it("keeps recursively created parents after removing their last child", async () => {
    const filesystem = new WorkspaceFilesystem();

    await filesystem.mkdir("/tasks/research");
    expect((await filesystem.rmdir("/tasks/research")).error).toBeUndefined();
    expect(await filesystem.exists("/tasks")).toBe(true);
    expect(await filesystem.lsInfo("/tasks")).toEqual([]);
    expect((await filesystem.rmdir("/tasks")).error).toBeUndefined();
  });

  it("requires an existing parent when mkdir is not recursive", async () => {
    const filesystem = new WorkspaceFilesystem();

    expect((await filesystem.mkdir("/tasks/research", false)).error).toContain(
      "Parent directory '/tasks/' does not exist",
    );
    expect(await filesystem.exists("/tasks")).toBe(false);
    expect(await filesystem.exists("/tasks/research")).toBe(false);
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
