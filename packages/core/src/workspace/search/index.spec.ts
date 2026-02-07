import { describe, expect, it } from "vitest";
import { Workspace } from "..";
import type { EmbeddingAdapter } from "../../memory/adapters/embedding/types";
import { InMemoryVectorAdapter } from "../../memory/adapters/vector/in-memory";
import { WorkspaceFilesystem } from "../filesystem";
import { WorkspaceSearch } from "./index";

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

describe("WorkspaceSearch", () => {
  it("returns normalized scores, line ranges, and score details", async () => {
    const filesystem = new WorkspaceFilesystem();
    const search = new WorkspaceSearch({ filesystem });

    const content = "alpha\nbeta gamma\nbeta again\n";
    await search.indexContent("/doc.txt", content);

    const results = await search.search("beta", { mode: "bm25", topK: 5 });
    expect(results.length).toBeGreaterThan(0);

    const result = results[0];
    expect(result.path).toBe("/doc.txt");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.scoreDetails?.bm25).toBeDefined();
    expect(result.lineRange).toEqual({ start: 2, end: 3 });
  });

  it("applies minScore filtering", async () => {
    const filesystem = new WorkspaceFilesystem();
    const search = new WorkspaceSearch({ filesystem });

    await search.indexContent("/doc.txt", "hello hello hello world");
    await search.indexContent("/other.txt", "hello there");
    const results = await search.search("hello", { mode: "bm25", minScore: 0.9 });

    expect(results.length).toBe(1);
  });

  it("supports vector and hybrid search modes", async () => {
    const filesystem = new WorkspaceFilesystem();
    const vector = new InMemoryVectorAdapter();
    const embedding: EmbeddingAdapter = {
      embed: async (text: string) => {
        const lower = text.toLowerCase();
        const countA = lower.split("a").length - 1;
        const countB = lower.split("b").length - 1;
        return [text.length, countA, countB];
      },
      embedBatch: async (texts: string[]) => Promise.all(texts.map((t) => embedding.embed(t))),
      getDimensions: () => 3,
      getModelName: () => "test-embedding",
    };

    const search = new WorkspaceSearch({
      filesystem,
      embedding,
      vector,
      defaultMode: "hybrid",
    });

    await search.indexContent("/a.txt", "aaaa token");
    await search.indexContent("/b.txt", "bbbb");

    const vectorResults = await search.search("aaaa", { mode: "vector", topK: 2 });
    expect(vectorResults[0]?.scoreDetails?.vector).toBeDefined();
    expect(vectorResults[0]?.vectorScore).toBeDefined();

    const hybridResults = await search.search("aaaa", { mode: "hybrid", topK: 2 });
    const hybridForA = hybridResults.find((item) => item.path === "/a.txt");
    expect(hybridForA?.scoreDetails?.bm25).toBeDefined();
    expect(hybridForA?.scoreDetails?.vector).toBeDefined();
  });

  it("formats index tool summaries", async () => {
    const workspace = new Workspace({
      filesystem: {
        files: {
          "/docs/summary.txt": buildFileData("hello world"),
        },
      },
      search: {},
    });
    const toolkit = workspace.createSearchToolkit();
    const executeOptions = createExecuteOptions() as any;

    const indexTool = toolkit.tools.find((tool) => tool.name === "workspace_index");
    const indexContentTool = toolkit.tools.find((tool) => tool.name === "workspace_index_content");
    if (!indexTool?.execute || !indexContentTool?.execute) {
      throw new Error("Workspace search index tools not found");
    }

    const indexOutput = await indexTool.execute({ path: "/", glob: "**/*.txt" }, executeOptions);
    expect(String(indexOutput)).toContain("Indexed 1 file(s).");
    expect(String(indexOutput)).toContain("Skipped 0 file(s).");

    const contentOutput = await indexContentTool.execute(
      { path: "/inline.txt", content: "alpha beta" },
      executeOptions,
    );
    expect(String(contentOutput)).toContain("Indexed 1 file(s).");
    expect(String(contentOutput)).toContain("Skipped 0 file(s).");
  });

  it("returns min_score filtered results with lineRange and scoreDetails", async () => {
    const workspace = new Workspace({ search: {} });
    const toolkit = workspace.createSearchToolkit();
    const executeOptions = createExecuteOptions() as any;

    const indexContentTool = toolkit.tools.find((tool) => tool.name === "workspace_index_content");
    const searchTool = toolkit.tools.find((tool) => tool.name === "workspace_search");
    if (!indexContentTool?.execute || !searchTool?.execute) {
      throw new Error("Workspace search tools not found");
    }

    await indexContentTool.execute(
      { path: "/doc.txt", content: "alpha\nbeta beta beta\nbeta again\n" },
      executeOptions,
    );
    await indexContentTool.execute({ path: "/other.txt", content: "beta" }, executeOptions);

    const output = (await searchTool.execute(
      { query: "beta", min_score: 1, top_k: 5 },
      executeOptions,
    )) as {
      results: Array<{
        path: string;
        lineRange?: { start: number; end: number };
        scoreDetails?: { bm25?: number };
        score: number;
      }>;
      total: number;
    };

    expect(output.results.length).toBe(1);
    const [first] = output.results;
    expect(first.lineRange).toEqual({ start: 2, end: 3 });
    expect(first.scoreDetails?.bm25).toBeDefined();
    expect(first.score).toBeGreaterThanOrEqual(0);
    expect(first.score).toBeLessThanOrEqual(1);

    const modelOutput = searchTool.toModelOutput?.({ output }) as
      | { type: string; value: string }
      | undefined;
    if (!modelOutput) {
      throw new Error("workspace_search toModelOutput not available");
    }
    expect(modelOutput?.value).toContain("Found 1 result(s):");
    expect(modelOutput?.value).toContain("lines 2-3");
    expect(modelOutput?.value).toContain("bm25=");
  });

  it("can return snippet-only output when include_content is false", async () => {
    const workspace = new Workspace({ search: {} });
    const toolkit = workspace.createSearchToolkit();
    const executeOptions = createExecuteOptions() as any;

    const indexContentTool = toolkit.tools.find((tool) => tool.name === "workspace_index_content");
    const searchTool = toolkit.tools.find((tool) => tool.name === "workspace_search");
    if (!indexContentTool?.execute || !searchTool?.execute) {
      throw new Error("Workspace search tools not found");
    }

    const content = "alpha beta gamma delta epsilon zeta eta theta I_WANT_FULL_CONTENT";
    await indexContentTool.execute({ path: "/doc.txt", content }, executeOptions);

    const output = (await searchTool.execute(
      {
        query: "beta",
        include_content: false,
        snippet_length: 24,
      },
      executeOptions,
    )) as { results: Array<{ content: string; snippet?: string }> };

    expect(output.results[0]?.content).toBe("");
    expect(output.results[0]?.snippet).toContain("beta");

    const modelOutput = searchTool.toModelOutput?.({ output }) as
      | { type: string; value: string }
      | undefined;
    expect(modelOutput?.value).not.toContain("I_WANT_FULL_CONTENT");
  });
});
