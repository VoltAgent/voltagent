import { describe, expect, it } from "vitest";
import { MarkdownChunker } from "../chunkers/markdown-chunker";

describe("MarkdownChunker", () => {
  it("splits markdown by headings and chunks sections", () => {
    const md = `# Title
Intro paragraph.

## Details
More text here.`;

    const chunker = new MarkdownChunker();
    const chunks = chunker.chunk(md, { maxTokens: 5 });
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0]?.metadata?.headingPath).toContain("Title");
    expect(
      chunks.some((c) => (c.metadata?.headingPath as string[] | undefined)?.includes("Details")),
    ).toBe(true);
  });

  it("detects lists, quotes, and code blocks with metadata", () => {
    const md = `
# Top
- item one
> quote line
\`\`\`js
console.log("hi");
\`\`\`
`;
    const chunker = new MarkdownChunker();
    const chunks = chunker.chunk(md, { maxTokens: 10 });
    expect(chunks.some((c) => c.metadata?.blockType === "list")).toBe(true);
    expect(chunks.some((c) => c.metadata?.blockType === "blockquote")).toBe(true);
    expect(
      chunks.some((c) => c.metadata?.blockType === "code" && c.metadata?.language === "js"),
    ).toBe(true);
  });
});
