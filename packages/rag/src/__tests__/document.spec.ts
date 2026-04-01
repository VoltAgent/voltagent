import { describe, expect, it } from "vitest";
import { StructuredDocument } from "../document/document";

describe("MDocument", () => {
  it("extracts title/summary/keywords/questions and preserves doc relationships", () => {
    const doc = StructuredDocument.fromText(
      "Title line\nContent with cats and dogs? Another line.",
    );
    doc.extract({ title: true, summary: true, keywords: true, questions: true });
    const nodes = doc.getNodes();
    expect(nodes[0]?.metadata?.title).toContain("Title line");
    expect(nodes[0]?.metadata?.summary).toBeTruthy();
    expect((nodes[0]?.metadata?.keywords as string[]).length).toBeGreaterThan(0);
    expect((nodes[0]?.metadata?.questions as string[]).length).toBeGreaterThan(0);
  });

  it("chunks document and attaches docId metadata", () => {
    const doc = StructuredDocument.fromText("# Heading\nPara text here.");
    const { chunks } = doc.chunk({ strategy: "markdown", maxTokens: 10 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.metadata?.docId).toBeDefined();
    const graph = doc.getLinkGraph();
    expect(Object.keys(graph).length).toBeGreaterThan(0);
  });

  it("supports table and code strategies", () => {
    const doc = StructuredDocument.fromText("Intro\n| h1 | h2 |\n| -- | -- |\n| a | b |");
    const tableChunks = doc.chunk({ strategy: "table", maxTokens: 50 }).chunks;
    expect(tableChunks.some((c) => c.metadata?.sourceType === "table")).toBe(true);

    const codeDoc = StructuredDocument.fromText("```js\nfunction f() { return 1; }\n```");
    const codeChunks = codeDoc.chunk({ strategy: "code", maxTokens: 50 }).chunks;
    expect(codeChunks.some((c) => c.metadata?.sourceType === "code")).toBe(true);
  });

  it("auto strategy picks format heuristically", () => {
    const jsonDoc = StructuredDocument.fromText('{"a": 1, "b": 2}');
    const { chunks } = jsonDoc.chunk({ strategy: "auto", maxTokens: 20 });
    expect(chunks[0]?.metadata?.sourceType).toBe("json");
  });
});
