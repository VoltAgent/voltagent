import type { Span } from "@opentelemetry/api";
import { describe, expect, it, vi } from "vitest";
import { Workspace } from "../index";
import { createWorkspaceFilesystemToolkit } from "./index";

const createExecuteOptions = () => ({
  systemContext: new Map(),
  abortController: new AbortController(),
});

const buildFileData = (content: string) => {
  const timestamp = new Date().toISOString();
  return {
    content: content.split("\n"),
    created_at: timestamp,
    modified_at: timestamp,
  };
};

describe("Workspace filesystem toolkit", () => {
  it("records each concurrent file operation on its own tool span, not the shared fallback", async () => {
    const workspace = new Workspace({
      id: "trace-test",
      filesystem: { files: { "/a.txt": buildFileData("A"), "/b.txt": buildFileData("B") } },
    });
    const toolkit = createWorkspaceFilesystemToolkit({
      filesystem: workspace.filesystem,
      workspace: { id: workspace.id, scope: workspace.scope },
    });
    const read = toolkit.tools.find((tool) => tool.name === "read_file");
    const shared = { setAttribute: vi.fn() };
    const first = { setAttribute: vi.fn() };
    const second = { setAttribute: vi.fn() };
    const systemContext = new Map([["parentToolSpan", shared]]);
    await Promise.all([
      read?.execute?.(
        { file_path: "/a.txt" },
        { ...createExecuteOptions(), systemContext, parentToolSpan: first as unknown as Span },
      ),
      read?.execute?.(
        { file_path: "/b.txt" },
        { ...createExecuteOptions(), systemContext, parentToolSpan: second as unknown as Span },
      ),
    ]);
    expect(first.setAttribute).toHaveBeenCalledWith("workspace.fs.path", "/a.txt");
    expect(second.setAttribute).toHaveBeenCalledWith("workspace.fs.path", "/b.txt");
    expect(shared.setAttribute).not.toHaveBeenCalled();
  });

  it("supports list_tree, glob, grep, stat, mkdir, and rmdir", async () => {
    const workspace = new Workspace({
      filesystem: {
        files: {
          "/notes/summary.md": buildFileData("hello world"),
          "/notes/sub/info.txt": buildFileData("beta"),
        },
      },
    });

    const toolkit = createWorkspaceFilesystemToolkit(
      { filesystem: workspace.filesystem, workspace },
      {},
    );

    const getTool = (name: string) => toolkit.tools.find((tool) => tool.name === name);
    const executeOptions = createExecuteOptions() as any;

    const listTree = await getTool("list_tree")?.execute?.(
      { path: "/notes", max_depth: 3 },
      executeOptions,
    );
    expect(String(listTree)).toContain("- summary.md");
    expect(String(listTree)).toContain("- sub/");

    const listFiles = await getTool("list_files")?.execute?.(
      { path: "/notes", max_depth: 3 },
      executeOptions,
    );
    expect(String(listFiles)).toContain("- summary.md");

    const glob = await getTool("glob")?.execute?.(
      { pattern: "**/*.md", path: "/notes" },
      executeOptions,
    );
    expect(String(glob)).toContain("/notes/summary.md");

    const grep = await getTool("grep")?.execute?.(
      { pattern: "hello", path: "/notes" },
      executeOptions,
    );
    expect(String(grep)).toContain("/notes/summary.md:");
    expect(String(grep)).toContain("1: hello world");

    const stat = await getTool("stat")?.execute?.({ path: "/notes/summary.md" }, executeOptions);
    expect(String(stat)).toContain("type: file");

    const mkdir = await getTool("mkdir")?.execute?.(
      { path: "/notes/new", recursive: true },
      executeOptions,
    );
    expect(String(mkdir)).toContain("Successfully created directory");

    const rmdir = await getTool("rmdir")?.execute?.(
      { path: "/notes/new", recursive: false },
      executeOptions,
    );
    expect(String(rmdir)).toContain("Successfully removed directory");

    const deleteResult = await getTool("delete_file")?.execute?.(
      { file_path: "/notes/summary.md" },
      executeOptions,
    );
    expect(String(deleteResult)).toContain("Successfully deleted");
  });

  it("enforces read-before-write when policy is enabled", async () => {
    const workspace = new Workspace({
      filesystem: {
        files: {
          "/notes/summary.md": buildFileData("hello world"),
        },
      },
      toolConfig: {
        filesystem: {
          tools: {
            write_file: { requireReadBeforeWrite: true },
          },
        },
      },
    });

    const toolkit = workspace.createFilesystemToolkit();
    const executeOptions = createExecuteOptions() as any;

    const writeTool = toolkit.tools.find((tool) => tool.name === "write_file");
    const readTool = toolkit.tools.find((tool) => tool.name === "read_file");

    const firstWrite = await writeTool?.execute?.(
      { file_path: "/notes/summary.md", content: "updated", overwrite: true },
      executeOptions,
    );
    expect(String(firstWrite)).toContain("Please read");

    await readTool?.execute?.({ file_path: "/notes/summary.md" }, executeOptions);

    const secondWrite = await writeTool?.execute?.(
      { file_path: "/notes/summary.md", content: "updated", overwrite: true },
      executeOptions,
    );
    expect(String(secondWrite)).toContain("Successfully wrote");
  });
});
