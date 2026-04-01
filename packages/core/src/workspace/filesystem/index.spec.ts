import { describe, expect, it } from "vitest";
import { WorkspaceFilesystem } from "./index";

describe("WorkspaceFilesystem", () => {
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
